package backend

import (
	"fmt"
	"net/http"
	"net/http/pprof"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"

	"github.com/grafana/grafana-plugin-sdk-go/backend/tracing"
	"github.com/grafana/grafana-plugin-sdk-go/build"
	"github.com/grafana/grafana-plugin-sdk-go/internal/tracerprovider"
)

var (
	// PluginProfilerEnvDeprecated is a deprecated constant for the GF_PLUGINS_PROFILER environment variable used to enable pprof.
	PluginProfilerEnvDeprecated = "GF_PLUGINS_PROFILER"
	// PluginProfilingEnabledEnv is a constant for the GF_PLUGIN_PROFILING_ENABLED environment variable used to enable pprof.
	PluginProfilingEnabledEnv = "GF_PLUGIN_PROFILING_ENABLED"

	// PluginProfilerPortEnvDeprecated is a constant for the GF_PLUGINS_PROFILER_PORT environment variable use to specify a pprof port (default 6060).
	PluginProfilerPortEnvDeprecated = "GF_PLUGINS_PROFILER_PORT"
	// PluginProfilingPortEnv is a constant for the GF_PLUGIN_PROFILING_PORT environment variable use to specify a pprof port (default 6060).
	PluginProfilingPortEnv = "GF_PLUGIN_PROFILING_PORT"

	// PluginTracingOpenTelemetryOTLPAddressEnv is a constant for the GF_INSTANCE_OTLP_ADDRESS
	// environment variable used to specify the OTLP Address.
	PluginTracingOpenTelemetryOTLPAddressEnv = "GF_INSTANCE_OTLP_ADDRESS"
	// PluginTracingOpenTelemetryOTLPPropagationEnv is a constant for the GF_INSTANCE_OTLP_PROPAGATION
	// environment variable used to specify the OTLP propagation format.
	PluginTracingOpenTelemetryOTLPPropagationEnv = "GF_INSTANCE_OTLP_PROPAGATION"

	// PluginVersionEnv is a constant for the GF_PLUGIN_VERSION environment variable containing the plugin's version.
	// Deprecated: Use build.GetBuildInfo().Version instead.
	PluginVersionEnv = "GF_PLUGIN_VERSION"
)

// SetupPluginEnvironment will read the environment variables and apply the
// standard environment behavior.
//
// As the SDK evolves, this will likely change.
//
// Currently, this function enables and configures profiling with pprof.
func SetupPluginEnvironment(pluginID string) {
	setupProfiler(pluginID)
}

func setupProfiler(pluginID string) {
	// Enable profiler
	profilerEnabled := false
	if value, ok := os.LookupEnv(PluginProfilerEnvDeprecated); ok {
		// compare value to plugin name
		if value == pluginID {
			profilerEnabled = true
		}
	} else if value, ok = os.LookupEnv(PluginProfilingEnabledEnv); ok {
		if value == "true" {
			profilerEnabled = true
		}
	}

	Logger.Debug("Profiler", "enabled", profilerEnabled)
	if profilerEnabled {
		profilerPort := "6060"
		for _, env := range []string{PluginProfilerPortEnvDeprecated, PluginProfilingPortEnv} {
			if value, ok := os.LookupEnv(env); ok {
				profilerPort = value
				break
			}
		}
		Logger.Info("Profiler", "port", profilerPort)
		portConfig := fmt.Sprintf(":%s", profilerPort)

		r := http.NewServeMux()
		r.HandleFunc("/debug/pprof/", pprof.Index)
		r.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
		r.HandleFunc("/debug/pprof/profile", pprof.Profile)
		r.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
		r.HandleFunc("/debug/pprof/trace", pprof.Trace)

		go func() {
			//nolint:gosec
			if err := http.ListenAndServe(portConfig, r); err != nil {
				Logger.Error("Error Running profiler", "error", err)
			}
		}()
	}
}

func getTracerCustomAttributes(pluginID string) []attribute.KeyValue {
	var customAttributes []attribute.KeyValue
	// Add plugin id and version to custom attributes
	// Try to get plugin version from build info
	// If not available, fallback to environment variable
	var pluginVersion string
	buildInfo, err := build.GetBuildInfo()
	if err != nil {
		Logger.Debug("Failed to get build info", "error", err)
	} else {
		pluginVersion = buildInfo.Version
	}
	if pluginVersion == "" {
		if pv, ok := os.LookupEnv(PluginVersionEnv); ok {
			pluginVersion = pv
		}
	}
	customAttributes = []attribute.KeyValue{
		semconv.ServiceNameKey.String(pluginID),
		semconv.ServiceVersionKey.String(pluginVersion),
	}
	return customAttributes
}

// SetupTracer sets up the global OTEL trace provider and tracer.
func SetupTracer(pluginID string, tracingOpts tracing.Opts) error {
	// Set up tracing
	tracingCfg := getTracingConfig()
	if tracingCfg.IsEnabled() {
		// Append custom attributes to the default ones
		tracingOpts.CustomAttributes = append(getTracerCustomAttributes(pluginID), tracingOpts.CustomAttributes...)

		// Initialize global tracer provider
		tp, err := tracerprovider.NewTracerProvider(tracingCfg.Address, tracingOpts)
		if err != nil {
			return fmt.Errorf("new trace provider: %w", err)
		}
		pf, err := tracerprovider.NewTextMapPropagator(tracingCfg.Propagation)
		if err != nil {
			return fmt.Errorf("new propagator format: %w", err)
		}
		tracerprovider.InitGlobalTracerProvider(tp, pf)

		// Initialize global tracer for plugin developer usage
		tracing.InitDefaultTracer(otel.Tracer(pluginID))
	}
	Logger.Debug("Tracing", "enabled", tracingCfg.IsEnabled(), "propagation", tracingCfg.Propagation)
	return nil
}

// tracingConfig contains the configuration for OTEL tracing.
type tracingConfig struct {
	Address     string
	Propagation string
}

// IsEnabled returns true if OTEL tracing is enabled.
func (c tracingConfig) IsEnabled() bool {
	return c.Address != ""
}

// getTracingConfig returns a new tracingConfig based on the current environment variables.
func getTracingConfig() tracingConfig {
	var otelAddr, otelPropagation string
	otelAddr, ok := os.LookupEnv(PluginTracingOpenTelemetryOTLPAddressEnv)
	if ok {
		otelPropagation = os.Getenv(PluginTracingOpenTelemetryOTLPPropagationEnv)
	}
	return tracingConfig{
		Address:     otelAddr,
		Propagation: otelPropagation,
	}
}
