package log

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLogLevel(t *testing.T) {
	logger := New()
	level := logger.Level()
	assert.Equal(t, level, Debug)
}

func TestLogLevelWarn(t *testing.T) {
	logger := NewWithLevel(Warn)
	level := logger.Level()
	assert.Equal(t, level, Warn)
}

func TestLogFromContext(t *testing.T) {
	t.Run("should return a new empty logger with empty context", func(t *testing.T) {
		ctx := context.Background()
		logger := New()
		ctxLogger := logger.FromContext(ctx)
		require.NotEqual(t, logger, ctxLogger)
		require.Empty(t, ctxLogger.(*hclogWrapper).logger.ImpliedArgs())
	})

	t.Run("should return logger with contextual params when set in context", func(t *testing.T) {
		ctx := WithContextualAttributes(context.Background(), []any{"key", "value"})
		logger := New()
		ctxLogger := logger.FromContext(ctx)
		require.NotEqual(t, logger, ctxLogger)
		require.Equal(t, []any{"key", "value"}, ctxLogger.(*hclogWrapper).logger.ImpliedArgs())
	})

	t.Run("params set in the logger should be kept in the contextual logger", func(t *testing.T) {
		logger := New().With("service", "myservice")
		ctxLogger := logger.FromContext(WithContextualAttributes(context.Background(), []any{"key", "value"}))
		require.NotEqual(t, logger, ctxLogger)
		require.Equal(t, []any{"key", "value", "service", "myservice"}, ctxLogger.(*hclogWrapper).logger.ImpliedArgs())
	})
}
