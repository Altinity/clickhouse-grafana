package macros

import (
	"fmt"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func FromMacro(inputString string, timeRange backend.TimeRange) (string, error) {
	res, err := applyMacro("$$from", inputString, func(query string, args []string) (string, error) {
		return expandTimeMacro(timeRange.From, args)
	})
	return res, err
}

func ToMacro(inputString string, timeRange backend.TimeRange) (string, error) {
	res, err := applyMacro("$$to", inputString, func(query string, args []string) (string, error) {
		return expandTimeMacro(timeRange.To, args)
	})
	return res, err
}

func expandTimeMacro(t time.Time, args []string) (string, error) {
	if len(args) < 1 || args[0] == "" {
		return fmt.Sprintf("%d", t.UnixMilli()), nil
	}
	if args[0] == "date" {
		if len(args) < 2 || args[1] == ":iso" {
			return t.Format("2006-01-02T15:04:05.999Z"), nil
		}
	}
	format := strings.TrimPrefix(strings.Join(args, ","), "date:")
	if format == "iso" {
		return t.Format("2006-01-02T15:04:05.999Z"), nil
	}
	format = strings.ReplaceAll(format, "YYYY", "2006")
	format = strings.ReplaceAll(format, "YY", "06")

	format = strings.ReplaceAll(format, "MMMM", "January")
	format = strings.ReplaceAll(format, "MMM", "Jan")
	format = strings.ReplaceAll(format, "MM", "01")
	format = strings.ReplaceAll(format, "M", "1")

	format = strings.ReplaceAll(format, "DD", "02")
	format = strings.ReplaceAll(format, "D", "2")

	format = strings.ReplaceAll(format, "hh", "03")
	format = strings.ReplaceAll(format, "h", "3")
	format = strings.ReplaceAll(format, "HH", "15")

	format = strings.ReplaceAll(format, "mm", "04")
	format = strings.ReplaceAll(format, "m", "4")

	format = strings.ReplaceAll(format, "ss", "05")
	format = strings.ReplaceAll(format, "s", "5")

	format = strings.ReplaceAll(format, "S", "0")

	format = strings.ReplaceAll(format, "A", "PM")

	format = strings.ReplaceAll(format, "zz", "MST")
	format = strings.ReplaceAll(format, "z", "MST")

	format = strings.ReplaceAll(format, "dddd", "Monday")
	format = strings.ReplaceAll(format, "ddd", "Mon")

	return t.Format(format), nil
}
