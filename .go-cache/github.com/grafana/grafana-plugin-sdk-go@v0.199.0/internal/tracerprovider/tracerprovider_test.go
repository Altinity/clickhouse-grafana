package tracerprovider

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	jaegerpropagator "go.opentelemetry.io/contrib/propagators/jaeger"
	"go.opentelemetry.io/otel/propagation"
)

func TestNewTextMapPropagator(t *testing.T) {
	for _, tc := range []struct {
		name  string
		input string
		exp   propagation.TextMapPropagator
	}{
		{name: "jaeger", input: "jaeger", exp: jaegerpropagator.Jaeger{}},
		{name: "w3c", input: "w3c", exp: propagation.TraceContext{}},
		{name: "default", input: "", exp: propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{})},
		{name: "composite", input: "w3c,jaeger", exp: propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, jaegerpropagator.Jaeger{})},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p, err := NewTextMapPropagator(tc.input)
			require.NoError(t, err)
			assert.Equal(t, tc.exp, p)
		})
	}

	t.Run("unsupported", func(t *testing.T) {
		_, err := NewTextMapPropagator("unknown")
		require.Error(t, err)
	})
}
