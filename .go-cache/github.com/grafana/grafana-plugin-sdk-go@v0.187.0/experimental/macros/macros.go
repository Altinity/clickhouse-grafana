package macros

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func ApplyMacros(input string, timeRange backend.TimeRange, _ backend.PluginContext) (string, error) {
	input, err := FromMacro(input, timeRange)
	if err != nil {
		return input, err
	}
	input, err = ToMacro(input, timeRange)
	if err != nil {
		return input, err
	}
	return input, nil
}

type macroFunc func(string, []string) (string, error)

func getMatches(macroName, input string) ([][]string, error) {
	macroRegex := fmt.Sprintf("\\$__%s\\b(?:\\((.*?)\\))?", macroName) // regular macro syntax
	if strings.HasPrefix(macroName, "$$") {                            // prefix $$ is used to denote macro from frontend or grafana global variable
		macroRegex = fmt.Sprintf("\\${__%s:?(.*?)}", strings.TrimPrefix(macroName, "$$"))
	}
	rgx, err := regexp.Compile(macroRegex)
	if err != nil {
		return nil, err
	}
	return rgx.FindAllStringSubmatch(input, -1), nil
}

func applyMacro(macroKey string, queryString string, macro macroFunc) (string, error) {
	matches, err := getMatches(macroKey, queryString)
	if err != nil {
		return queryString, err
	}
	for _, match := range matches {
		if len(match) == 0 {
			continue
		}
		args := []string{}
		if len(match) > 1 {
			args = strings.Split(match[1], ",")
		}
		res, err := macro(queryString, args)
		if err != nil {
			return queryString, err
		}
		queryString = strings.ReplaceAll(queryString, match[0], res)
	}
	return strings.TrimSpace(queryString), nil
}
