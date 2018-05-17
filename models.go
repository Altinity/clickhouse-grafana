package main

type TargetResponseDTO struct {
	Target     string           `json:"target"`
	DataPoints TimeSeriesPoints `json:"datapoints"`
}

type TimePoint [2]float64
type TimeSeriesPoints []TimePoint