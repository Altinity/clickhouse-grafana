package framestruct_test

import (
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/framestruct"
)

// This is here to avoid compiler optimizations that
// could remove the actual call we are benchmarking
// during benchmarks
var benchmarkResult *data.Frame

func benchMarshal(b *testing.B, v interface{}) {
	b.Helper()
	b.Run("marshal", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			benchmarkResult, _ = framestruct.ToDataFrame("frame", v)
		}
	})
}

func benchmarkTable(b *testing.B, count int64) {
	b.Helper()
	type table struct {
		Field1 string `frame:"field1"`
		Field2 string `frame:"field2"`
		Field3 string `frame:"field3"`
	}
	value := make([]table, count)

	for i := range value {
		value[i] = table{
			Field1: "field1",
			Field2: "field2",
			Field3: "field3",
		}
	}

	benchMarshal(b, value)
}

func benchmarkEmbedded(b *testing.B, count int) {
	b.Helper()
	type embeddedDimension struct {
		Descriptor string
		Value      float64 `frame:"val"`
	}

	type tsd struct {
		Timestamp time.Time         `frame:"ts"`
		Dimension embeddedDimension `frame:"dimension"`
	}

	now := time.Now()
	value := make([]tsd, count)

	for i := range value {
		value[i] = tsd{
			Timestamp: now.Add(time.Duration(i) * time.Minute),
			Dimension: embeddedDimension{
				Descriptor: "descriptor",
				Value:      123.0,
			},
		}
	}

	benchMarshal(b, value)
}

func BenchmarkMarshalTable_10(b *testing.B)    { benchmarkTable(b, 10) }
func BenchmarkMarshalTable_100(b *testing.B)   { benchmarkTable(b, 100) }
func BenchmarkMarshalTable_1000(b *testing.B)  { benchmarkTable(b, 1000) }
func BenchmarkMarshalTable_10000(b *testing.B) { benchmarkTable(b, 10000) }

func BenchmarkEmbeddedStruct_10(b *testing.B)    { benchmarkEmbedded(b, 10) }
func BenchmarkEmbeddedStruct_100(b *testing.B)   { benchmarkEmbedded(b, 100) }
func BenchmarkEmbeddedStruct_1000(b *testing.B)  { benchmarkEmbedded(b, 1000) }
func BenchmarkEmbeddedStruct_10000(b *testing.B) { benchmarkEmbedded(b, 10000) }
