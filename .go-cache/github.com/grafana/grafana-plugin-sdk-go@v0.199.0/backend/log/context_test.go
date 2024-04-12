package log

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestContextualLogger(t *testing.T) {
	t.Run("WithContextualAttributes", func(t *testing.T) {
		t.Run("simple", func(t *testing.T) {
			logParams := []any{"key", "value"}
			ctx := WithContextualAttributes(context.Background(), logParams)
			attrs := ContextualAttributesFromContext(ctx)
			require.Equal(t, logParams, attrs)
		})

		t.Run("should append to existing value", func(t *testing.T) {
			ctx := WithContextualAttributes(context.Background(), []any{"a", "b"})
			ctx = WithContextualAttributes(ctx, []any{"c", "d"})
			attrs := ContextualAttributesFromContext(ctx)
			require.Equal(t, []any{"a", "b", "c", "d"}, attrs)
		})
	})

	t.Run("ContextualAttributesFromContext on empty context should return empty slice", func(t *testing.T) {
		attrs := ContextualAttributesFromContext(context.Background())
		require.Empty(t, attrs)
	})
}
