package oauthtokenretriever

import (
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"

	"github.com/go-jose/go-jose/v3"
	"github.com/go-jose/go-jose/v3/jwt"
)

type signer interface {
	sign(payload interface{}) (string, error)
}

type jwtSigner struct {
	signer jose.Signer
}

// parsePrivateKey parses a PEM encoded private key.
func parsePrivateKey(pemBytes []byte) (signer, error) {
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, errors.New("crypto: no key found")
	}

	var rawkey interface{}
	var alg jose.SignatureAlgorithm
	switch block.Type {
	case "RSA PRIVATE KEY":
		alg = jose.RS256
		rsa, err := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			return nil, err
		}
		rawkey = rsa
	case "PRIVATE KEY":
		alg = jose.ES256
		ecdsa, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, err
		}
		rawkey = ecdsa
	default:
		return nil, fmt.Errorf("crypto: unsupported private key type %q", block.Type)
	}
	s, err := jose.NewSigner(jose.SigningKey{Algorithm: alg, Key: rawkey}, &jose.SignerOptions{})
	if err != nil {
		return nil, err
	}
	return &jwtSigner{signer: s}, nil
}

func (s *jwtSigner) sign(payload interface{}) (string, error) {
	return jwt.Signed(s.signer).Claims(payload).CompactSerialize()
}
