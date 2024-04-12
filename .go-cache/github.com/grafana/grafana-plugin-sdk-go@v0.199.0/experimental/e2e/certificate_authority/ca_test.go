package ca_test

import (
	"crypto/tls"
	_ "embed"

	"testing"

	ca "github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/certificate_authority"
	"github.com/stretchr/testify/require"
)

//go:embed testdata/cert.pem
var testCert []byte

//go:embed testdata/key.pem
var testKey []byte

func TestLoadCAKeyPair(t *testing.T) {
	t.Run("should use default key pair if paths are not defined", func(t *testing.T) {
		expected, err := tls.X509KeyPair(ca.CACertificate, ca.CAKey)
		require.NoError(t, err)
		actual, err := ca.GetCertificate("", "")
		require.NoError(t, err)
		require.Equal(t, expected.Certificate, actual.Certificate)
	})

	t.Run("should read key pair from provided paths", func(t *testing.T) {
		expected, err := tls.X509KeyPair(testCert, testKey)
		require.NoError(t, err)
		actual, err := ca.GetCertificate("testdata/cert.pem", "testdata/key.pem")
		require.NoError(t, err)
		require.Equal(t, expected.Certificate, actual.Certificate)
	})

	t.Run("should error if cert path is incorrect", func(t *testing.T) {
		_, err := ca.GetCertificate("testdata/bad.pem", "testdata/key.pem")
		require.Error(t, err)
	})

	t.Run("should error if key path is incorrect", func(t *testing.T) {
		_, err := ca.GetCertificate("testdata/cert.pem", "testdata/bad.pem")
		require.Error(t, err)
	})

	t.Run("should error if cert and key paths are switched", func(t *testing.T) {
		_, err := ca.GetCertificate("testdata/key.pem", "testdata/cert.pem")
		require.Error(t, err)
	})
}
