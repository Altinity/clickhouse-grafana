// Copyright 2023 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

//go:build go1.21

package quic

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net/netip"
	"time"
)

// A Conn is a QUIC connection.
//
// Multiple goroutines may invoke methods on a Conn simultaneously.
type Conn struct {
	side      connSide
	listener  *Listener
	config    *Config
	testHooks connTestHooks
	peerAddr  netip.AddrPort

	msgc   chan any
	donec  chan struct{} // closed when conn loop exits
	exited bool          // set to make the conn loop exit immediately

	w           packetWriter
	acks        [numberSpaceCount]ackState // indexed by number space
	lifetime    lifetimeState
	connIDState connIDState
	loss        lossState
	streams     streamsState

	// idleTimeout is the time at which the connection will be closed due to inactivity.
	// https://www.rfc-editor.org/rfc/rfc9000#section-10.1
	maxIdleTimeout time.Duration
	idleTimeout    time.Time

	// Packet protection keys, CRYPTO streams, and TLS state.
	keysInitial   fixedKeyPair
	keysHandshake fixedKeyPair
	keysAppData   updatingKeyPair
	crypto        [numberSpaceCount]cryptoStream
	tls           *tls.QUICConn

	// handshakeConfirmed is set when the handshake is confirmed.
	// For server connections, it tracks sending HANDSHAKE_DONE.
	handshakeConfirmed sentVal

	peerAckDelayExponent int8 // -1 when unknown

	// Tests only: Send a PING in a specific number space.
	testSendPingSpace numberSpace
	testSendPing      sentVal
}

// connTestHooks override conn behavior in tests.
type connTestHooks interface {
	nextMessage(msgc chan any, nextTimeout time.Time) (now time.Time, message any)
	handleTLSEvent(tls.QUICEvent)
	newConnID(seq int64) ([]byte, error)
	waitUntil(ctx context.Context, until func() bool) error
	timeNow() time.Time
}

func newConn(now time.Time, side connSide, initialConnID []byte, peerAddr netip.AddrPort, config *Config, l *Listener, hooks connTestHooks) (*Conn, error) {
	c := &Conn{
		side:                 side,
		listener:             l,
		config:               config,
		peerAddr:             peerAddr,
		msgc:                 make(chan any, 1),
		donec:                make(chan struct{}),
		testHooks:            hooks,
		maxIdleTimeout:       defaultMaxIdleTimeout,
		idleTimeout:          now.Add(defaultMaxIdleTimeout),
		peerAckDelayExponent: -1,
	}

	// A one-element buffer allows us to wake a Conn's event loop as a
	// non-blocking operation.
	c.msgc = make(chan any, 1)

	var originalDstConnID []byte
	if c.side == clientSide {
		if err := c.connIDState.initClient(c); err != nil {
			return nil, err
		}
		initialConnID, _ = c.connIDState.dstConnID()
	} else {
		if err := c.connIDState.initServer(c, initialConnID); err != nil {
			return nil, err
		}
		originalDstConnID = initialConnID
	}

	// The smallest allowed maximum QUIC datagram size is 1200 bytes.
	// TODO: PMTU discovery.
	const maxDatagramSize = 1200
	c.keysAppData.init()
	c.loss.init(c.side, maxDatagramSize, now)
	c.streamsInit()
	c.lifetimeInit()

	// TODO: retry_source_connection_id
	if err := c.startTLS(now, initialConnID, transportParameters{
		initialSrcConnID:               c.connIDState.srcConnID(),
		originalDstConnID:              originalDstConnID,
		ackDelayExponent:               ackDelayExponent,
		maxUDPPayloadSize:              maxUDPPayloadSize,
		maxAckDelay:                    maxAckDelay,
		disableActiveMigration:         true,
		initialMaxData:                 config.maxConnReadBufferSize(),
		initialMaxStreamDataBidiLocal:  config.maxStreamReadBufferSize(),
		initialMaxStreamDataBidiRemote: config.maxStreamReadBufferSize(),
		initialMaxStreamDataUni:        config.maxStreamReadBufferSize(),
		initialMaxStreamsBidi:          c.streams.remoteLimit[bidiStream].max,
		initialMaxStreamsUni:           c.streams.remoteLimit[uniStream].max,
		activeConnIDLimit:              activeConnIDLimit,
	}); err != nil {
		return nil, err
	}

	go c.loop(now)
	return c, nil
}

func (c *Conn) String() string {
	return fmt.Sprintf("quic.Conn(%v,->%v)", c.side, c.peerAddr)
}

// confirmHandshake is called when the handshake is confirmed.
// https://www.rfc-editor.org/rfc/rfc9001#section-4.1.2
func (c *Conn) confirmHandshake(now time.Time) {
	// If handshakeConfirmed is unset, the handshake is not confirmed.
	// If it is unsent, the handshake is confirmed and we need to send a HANDSHAKE_DONE.
	// If it is sent, we have sent a HANDSHAKE_DONE.
	// If it is received, the handshake is confirmed and we do not need to send anything.
	if c.handshakeConfirmed.isSet() {
		return // already confirmed
	}
	if c.side == serverSide {
		// When the server confirms the handshake, it sends a HANDSHAKE_DONE.
		c.handshakeConfirmed.setUnsent()
		c.listener.serverConnEstablished(c)
	} else {
		// The client never sends a HANDSHAKE_DONE, so we set handshakeConfirmed
		// to the received state, indicating that the handshake is confirmed and we
		// don't need to send anything.
		c.handshakeConfirmed.setReceived()
	}
	c.loss.confirmHandshake()
	// "An endpoint MUST discard its Handshake keys when the TLS handshake is confirmed"
	// https://www.rfc-editor.org/rfc/rfc9001#section-4.9.2-1
	c.discardKeys(now, handshakeSpace)
}

// discardKeys discards unused packet protection keys.
// https://www.rfc-editor.org/rfc/rfc9001#section-4.9
func (c *Conn) discardKeys(now time.Time, space numberSpace) {
	switch space {
	case initialSpace:
		c.keysInitial.discard()
	case handshakeSpace:
		c.keysHandshake.discard()
	}
	c.loss.discardKeys(now, space)
}

// receiveTransportParameters applies transport parameters sent by the peer.
func (c *Conn) receiveTransportParameters(p transportParameters) error {
	if err := c.connIDState.validateTransportParameters(c.side, p); err != nil {
		return err
	}
	c.streams.outflow.setMaxData(p.initialMaxData)
	c.streams.localLimit[bidiStream].setMax(p.initialMaxStreamsBidi)
	c.streams.localLimit[uniStream].setMax(p.initialMaxStreamsUni)
	c.streams.peerInitialMaxStreamDataBidiLocal = p.initialMaxStreamDataBidiLocal
	c.streams.peerInitialMaxStreamDataRemote[bidiStream] = p.initialMaxStreamDataBidiRemote
	c.streams.peerInitialMaxStreamDataRemote[uniStream] = p.initialMaxStreamDataUni
	c.peerAckDelayExponent = p.ackDelayExponent
	c.loss.setMaxAckDelay(p.maxAckDelay)
	if err := c.connIDState.setPeerActiveConnIDLimit(c, p.activeConnIDLimit); err != nil {
		return err
	}
	if p.preferredAddrConnID != nil {
		var (
			seq           int64 = 1 // sequence number of this conn id is 1
			retirePriorTo int64 = 0 // retire nothing
			resetToken    [16]byte
		)
		copy(resetToken[:], p.preferredAddrResetToken)
		if err := c.connIDState.handleNewConnID(seq, retirePriorTo, p.preferredAddrConnID, resetToken); err != nil {
			return err
		}
	}

	// TODO: Many more transport parameters to come.

	return nil
}

type (
	timerEvent struct{}
	wakeEvent  struct{}
)

// loop is the connection main loop.
//
// Except where otherwise noted, all connection state is owned by the loop goroutine.
//
// The loop processes messages from c.msgc and timer events.
// Other goroutines may examine or modify conn state by sending the loop funcs to execute.
func (c *Conn) loop(now time.Time) {
	defer close(c.donec)
	defer c.tls.Close()
	defer c.listener.connDrained(c)

	// The connection timer sends a message to the connection loop on expiry.
	// We need to give it an expiry when creating it, so set the initial timeout to
	// an arbitrary large value. The timer will be reset before this expires (and it
	// isn't a problem if it does anyway). Skip creating the timer in tests which
	// take control of the connection message loop.
	var timer *time.Timer
	var lastTimeout time.Time
	hooks := c.testHooks
	if hooks == nil {
		timer = time.AfterFunc(1*time.Hour, func() {
			c.sendMsg(timerEvent{})
		})
		defer timer.Stop()
	}

	for !c.exited {
		sendTimeout := c.maybeSend(now) // try sending

		// Note that we only need to consider the ack timer for the App Data space,
		// since the Initial and Handshake spaces always ack immediately.
		nextTimeout := sendTimeout
		nextTimeout = firstTime(nextTimeout, c.idleTimeout)
		if !c.isClosingOrDraining() {
			nextTimeout = firstTime(nextTimeout, c.loss.timer)
			nextTimeout = firstTime(nextTimeout, c.acks[appDataSpace].nextAck)
		} else {
			nextTimeout = firstTime(nextTimeout, c.lifetime.drainEndTime)
		}

		var m any
		if hooks != nil {
			// Tests only: Wait for the test to tell us to continue.
			now, m = hooks.nextMessage(c.msgc, nextTimeout)
		} else if !nextTimeout.IsZero() && nextTimeout.Before(now) {
			// A connection timer has expired.
			now = time.Now()
			m = timerEvent{}
		} else {
			// Reschedule the connection timer if necessary
			// and wait for the next event.
			if !nextTimeout.Equal(lastTimeout) && !nextTimeout.IsZero() {
				// Resetting a timer created with time.AfterFunc guarantees
				// that the timer will run again. We might generate a spurious
				// timer event under some circumstances, but that's okay.
				timer.Reset(nextTimeout.Sub(now))
				lastTimeout = nextTimeout
			}
			m = <-c.msgc
			now = time.Now()
		}
		switch m := m.(type) {
		case *datagram:
			c.handleDatagram(now, m)
			m.recycle()
		case timerEvent:
			// A connection timer has expired.
			if !now.Before(c.idleTimeout) {
				// "[...] the connection is silently closed and
				// its state is discarded [...]"
				// https://www.rfc-editor.org/rfc/rfc9000#section-10.1-1
				c.exited = true
				return
			}
			c.loss.advance(now, c.handleAckOrLoss)
			if c.lifetimeAdvance(now) {
				// The connection has completed the draining period,
				// and may be shut down.
				return
			}
		case wakeEvent:
			// We're being woken up to try sending some frames.
		case func(time.Time, *Conn):
			// Send a func to msgc to run it on the main Conn goroutine
			m(now, c)
		default:
			panic(fmt.Sprintf("quic: unrecognized conn message %T", m))
		}
	}
}

// sendMsg sends a message to the conn's loop.
// It does not wait for the message to be processed.
// The conn may close before processing the message, in which case it is lost.
func (c *Conn) sendMsg(m any) {
	select {
	case c.msgc <- m:
	case <-c.donec:
	}
}

// wake wakes up the conn's loop.
func (c *Conn) wake() {
	select {
	case c.msgc <- wakeEvent{}:
	default:
	}
}

// runOnLoop executes a function within the conn's loop goroutine.
func (c *Conn) runOnLoop(f func(now time.Time, c *Conn)) error {
	donec := make(chan struct{})
	c.sendMsg(func(now time.Time, c *Conn) {
		defer close(donec)
		f(now, c)
	})
	select {
	case <-donec:
	case <-c.donec:
		return errors.New("quic: connection closed")
	}
	return nil
}

func (c *Conn) waitOnDone(ctx context.Context, ch <-chan struct{}) error {
	if c.testHooks != nil {
		return c.testHooks.waitUntil(ctx, func() bool {
			select {
			case <-ch:
				return true
			default:
			}
			return false
		})
	}
	// Check the channel before the context.
	// We always prefer to return results when available,
	// even when provided with an already-canceled context.
	select {
	case <-ch:
		return nil
	default:
	}
	select {
	case <-ch:
	case <-ctx.Done():
		return ctx.Err()
	}
	return nil
}

// firstTime returns the earliest non-zero time, or zero if both times are zero.
func firstTime(a, b time.Time) time.Time {
	switch {
	case a.IsZero():
		return b
	case b.IsZero():
		return a
	case a.Before(b):
		return a
	default:
		return b
	}
}
