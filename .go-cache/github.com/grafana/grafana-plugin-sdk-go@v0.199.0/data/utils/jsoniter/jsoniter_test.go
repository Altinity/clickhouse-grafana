package jsoniter

import (
	"io"
	"strings"
	"testing"

	j "github.com/json-iterator/go"
	"github.com/stretchr/testify/require"
)

func TestNewIterator(t *testing.T) {
	iter := j.NewIterator(j.ConfigDefault)
	jiter := NewIterator(iter)
	require.NotNil(t, jiter)
}

func TestRead(t *testing.T) {
	t.Run("should be able read the error", func(t *testing.T) {
		jiter := NewIterator(j.NewIterator(j.ConfigDefault))
		read, err := jiter.Read()
		require.Error(t, err)
		require.Nil(t, read)
	})

	t.Run("should be able read the json data", func(t *testing.T) {
		iter := j.Parse(ConfigDefault, io.NopCloser(strings.NewReader(`{"test":123}`)), 128)
		jiter := NewIterator(iter)
		read, err := jiter.Read()
		require.NoError(t, err)
		require.NotNil(t, read)
		r := read.(map[string]interface{})
		require.Equal(t, r["test"], float64(123))
	})
}

func TestParse(t *testing.T) {
	t.Run("should create a new iterator without any error", func(t *testing.T) {
		jiter := NewIterator(j.NewIterator(j.ConfigDefault))
		iter, err := jiter.Parse(ConfigDefault, io.NopCloser(strings.NewReader(`{"test":123}`)), 128)
		require.NoError(t, err)
		require.NotNil(t, iter)
	})
}
