package tracerprovider

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewOtelSampler(t *testing.T) {
	for _, tc := range []struct {
		name           string
		opts           SamplerOptions
		expDescription string
	}{
		{
			name:           "empty never",
			opts:           SamplerOptions{},
			expDescription: "AlwaysOffSampler",
		},
		{
			name:           "empty always",
			opts:           SamplerOptions{Param: 1.0},
			expDescription: "AlwaysOnSampler",
		},
		{
			name:           "const never",
			opts:           SamplerOptions{SamplerType: SamplerTypeConst, Param: 0.0},
			expDescription: "AlwaysOffSampler",
		},
		{
			name:           "const always",
			opts:           SamplerOptions{SamplerType: SamplerTypeConst, Param: 1.0},
			expDescription: "AlwaysOnSampler",
		},
		{
			name:           "probabilistic",
			opts:           SamplerOptions{SamplerType: "probabilistic", Param: 0.5},
			expDescription: "TraceIDRatioBased{0.5}",
		},
		{
			name:           "rate limiting",
			opts:           SamplerOptions{SamplerType: "rateLimiting", Param: 0.5},
			expDescription: "RateLimitingSampler{0.5}",
		},
		{
			name:           "remote",
			opts:           SamplerOptions{SamplerType: "remote", Remote: RemoteSamplerOptions{}},
			expDescription: "JaegerRemoteSampler{}",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			sampler, err := newOtelSampler(tc.opts)
			require.NoError(t, err)
			require.Equal(t, tc.expDescription, sampler.Description())
		})
	}
}
