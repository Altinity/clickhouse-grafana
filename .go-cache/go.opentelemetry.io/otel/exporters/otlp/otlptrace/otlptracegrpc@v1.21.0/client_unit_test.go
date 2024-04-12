// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package otlptracegrpc

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/genproto/googleapis/rpc/errdetails"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
)

func TestThrottleDelay(t *testing.T) {
	c := codes.ResourceExhausted
	testcases := []struct {
		status       *status.Status
		wantOK       bool
		wantDuration time.Duration
	}{
		{
			status:       status.New(c, "NoRetryInfo"),
			wantOK:       false,
			wantDuration: 0,
		},
		{
			status: func() *status.Status {
				s, err := status.New(c, "SingleRetryInfo").WithDetails(
					&errdetails.RetryInfo{
						RetryDelay: durationpb.New(15 * time.Millisecond),
					},
				)
				require.NoError(t, err)
				return s
			}(),
			wantOK:       true,
			wantDuration: 15 * time.Millisecond,
		},
		{
			status: func() *status.Status {
				s, err := status.New(c, "ErrorInfo").WithDetails(
					&errdetails.ErrorInfo{Reason: "no throttle detail"},
				)
				require.NoError(t, err)
				return s
			}(),
			wantOK:       false,
			wantDuration: 0,
		},
		{
			status: func() *status.Status {
				s, err := status.New(c, "ErrorAndRetryInfo").WithDetails(
					&errdetails.ErrorInfo{Reason: "with throttle detail"},
					&errdetails.RetryInfo{
						RetryDelay: durationpb.New(13 * time.Minute),
					},
				)
				require.NoError(t, err)
				return s
			}(),
			wantOK:       true,
			wantDuration: 13 * time.Minute,
		},
		{
			status: func() *status.Status {
				s, err := status.New(c, "DoubleRetryInfo").WithDetails(
					&errdetails.RetryInfo{
						RetryDelay: durationpb.New(13 * time.Minute),
					},
					&errdetails.RetryInfo{
						RetryDelay: durationpb.New(15 * time.Minute),
					},
				)
				require.NoError(t, err)
				return s
			}(),
			wantOK:       true,
			wantDuration: 13 * time.Minute,
		},
	}

	for _, tc := range testcases {
		t.Run(tc.status.Message(), func(t *testing.T) {
			ok, d := throttleDelay(tc.status)
			assert.Equal(t, tc.wantOK, ok)
			assert.Equal(t, tc.wantDuration, d)
		})
	}
}

func TestRetryable(t *testing.T) {
	retryableCodes := map[codes.Code]bool{
		codes.OK:                 false,
		codes.Canceled:           true,
		codes.Unknown:            false,
		codes.InvalidArgument:    false,
		codes.DeadlineExceeded:   true,
		codes.NotFound:           false,
		codes.AlreadyExists:      false,
		codes.PermissionDenied:   false,
		codes.ResourceExhausted:  false,
		codes.FailedPrecondition: false,
		codes.Aborted:            true,
		codes.OutOfRange:         true,
		codes.Unimplemented:      false,
		codes.Internal:           false,
		codes.Unavailable:        true,
		codes.DataLoss:           true,
		codes.Unauthenticated:    false,
	}

	for c, want := range retryableCodes {
		got, _ := retryable(status.Error(c, ""))
		assert.Equalf(t, want, got, "evaluate(%s)", c)
	}
}

func TestRetryableGRPCStatusResourceExhaustedWithRetryInfo(t *testing.T) {
	delay := 15 * time.Millisecond
	s, err := status.New(codes.ResourceExhausted, "WithRetryInfo").WithDetails(
		&errdetails.RetryInfo{
			RetryDelay: durationpb.New(delay),
		},
	)
	require.NoError(t, err)

	ok, d := retryableGRPCStatus(s)
	assert.True(t, ok)
	assert.Equal(t, delay, d)
}

func TestUnstartedStop(t *testing.T) {
	client := NewClient()
	assert.ErrorIs(t, client.Stop(context.Background()), errAlreadyStopped)
}

func TestUnstartedUploadTrace(t *testing.T) {
	client := NewClient()
	assert.ErrorIs(t, client.UploadTraces(context.Background(), nil), errShutdown)
}

func TestExportContextHonorsParentDeadline(t *testing.T) {
	now := time.Now()
	ctx, cancel := context.WithDeadline(context.Background(), now)
	t.Cleanup(cancel)

	// Without a client timeout, the parent deadline should be used.
	client := newClient(WithTimeout(0))
	eCtx, eCancel := client.exportContext(ctx)
	t.Cleanup(eCancel)

	deadline, ok := eCtx.Deadline()
	assert.True(t, ok, "deadline not propagated to child context")
	assert.Equal(t, now, deadline)
}

func TestExportContextHonorsClientTimeout(t *testing.T) {
	// Setting a timeout should ensure a deadline is set on the context.
	client := newClient(WithTimeout(1 * time.Second))
	ctx, cancel := client.exportContext(context.Background())
	t.Cleanup(cancel)

	_, ok := ctx.Deadline()
	assert.True(t, ok, "timeout not set as deadline for child context")
}

func TestExportContextLinksStopSignal(t *testing.T) {
	rootCtx := context.Background()

	client := newClient(WithInsecure())
	t.Cleanup(func() { require.NoError(t, client.Stop(rootCtx)) })
	require.NoError(t, client.Start(rootCtx))

	ctx, cancel := client.exportContext(rootCtx)
	t.Cleanup(cancel)

	require.False(t, func() bool {
		select {
		case <-ctx.Done():
			return true
		default:
		}
		return false
	}(), "context should not be done prior to canceling it")

	// The client.stopFunc cancels the client.stopCtx. This should have been
	// setup as a parent of ctx. Therefore, it should cancel ctx as well.
	client.stopFunc()

	// Assert this with Eventually to account for goroutine scheduler timing.
	assert.Eventually(t, func() bool {
		select {
		case <-ctx.Done():
			return true
		default:
		}
		return false
	}, 10*time.Second, time.Microsecond)
}
