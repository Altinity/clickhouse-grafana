package main

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/gopherjs/gopherjs/js"
)

type AdhocFilter struct {
	Key      string      `json:"key"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

type Target struct {
	Database string
	Table    string
}

type QueryRequest struct {
	RefId                  string
	RuleUid                string
	RawQuery               bool
	Query                  string
	Format                 string
	DateTimeType           string
	DateTimeField          string
	DateColDataType        string
	Interval               string
	Database               string
	Table                  string
	MaxDataPoints          int64
	FrontendDatasource     bool
	UseWindowFuncForMacros bool
	TimeRange              struct {
		From string
		To   string
	}
}

func parseTargets(from string, defaultDatabase string, defaultTable string) (string, string) {
	if len(from) == 0 {
		return "", ""
	}
	var targetTable, targetDatabase string
	parts := strings.Split(from, ".")
	switch len(parts) {
	case 1:
		targetTable = parts[0]
		targetDatabase = defaultDatabase
	case 2:
		targetDatabase = parts[0]
		targetTable = parts[1]
	default:
		panic(fmt.Sprintf("FROM expression \"%s\" can't be parsed", from))
	}
	if targetTable == "$table" {
		targetTable = defaultTable
	}
	return targetDatabase, targetTable
}

// JS: applyAdhocFilters(query, adhocFilters, target)
func applyAdhocFiltersJS(this *js.Object, args []*js.Object) interface{} {
	jsObj := args[0]
	query := jsObj.Get("query").String()
	adhocFiltersJS := jsObj.Get("adhocFilters")
	targetJS := jsObj.Get("target")

	adhocFilters := make([]AdhocFilter, adhocFiltersJS.Length())
	for i := 0; i < adhocFiltersJS.Length(); i++ {
		filter := adhocFiltersJS.Index(i)
		adhocFilters[i] = AdhocFilter{
			Key:      filter.Get("key").String(),
			Operator: filter.Get("operator").String(),
			Value:    filter.Get("value").Interface(),
		}
	}
	target := Target{
		Database: targetJS.Get("database").String(),
		Table:    targetJS.Get("table").String(),
	}

	adhocConditions := make([]string, 0)
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	topQueryAst := ast
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to parse query: %v", err),
		}
	}

	if len(adhocFilters) > 0 {
		for ast.HasOwnProperty("from") && ast.Obj["from"].(*eval.EvalAST).Arr == nil {
			nextAst, ok := ast.Obj["from"].(*eval.EvalAST)
			if !ok {
				break
			}
			ast = nextAst
		}
		if !ast.HasOwnProperty("where") {
			ast.Obj["where"] = &eval.EvalAST{Obj: make(map[string]interface{}), Arr: make([]interface{}, 0)}
		}
		targetDatabase, targetTable := parseTargets(ast.Obj["from"].(*eval.EvalAST).Arr[0].(string), target.Database, target.Table)
		for _, filter := range adhocFilters {
			var parts []string
			if strings.Contains(filter.Key, ".") {
				parts = strings.Split(filter.Key, ".")
			} else {
				parts = []string{targetDatabase, targetTable, filter.Key}
			}
			if len(parts) == 1 {
				parts = append([]string{targetTable}, parts...)
			}
			if len(parts) == 2 {
				parts = append([]string{targetTable}, parts...)
			}
			if len(parts) < 3 {
				continue
			}
			if targetDatabase != parts[0] || targetTable != parts[1] {
				continue
			}
			operator := filter.Operator
			switch operator {
			case "=~":
				operator = "LIKE"
			case "!~":
				operator = "NOT LIKE"
			}
			var value string
			switch v := filter.Value.(type) {
			case float64:
				value = fmt.Sprintf("%g", v)
			case string:
				if regexp.MustCompile(`^\s*\d+(\.\d+)?\s*$`).MatchString(v) || strings.Contains(v, "'") || strings.Contains(v, ", ") {
					value = v
				} else {
					escaped := strings.ReplaceAll(v, "'", "''")
					value = fmt.Sprintf("'%s'", escaped)
				}
			default:
				str := fmt.Sprintf("%v", v)
				escaped := strings.ReplaceAll(str, "'", "''")
				value = fmt.Sprintf("'%s'", escaped)
			}
			condition := fmt.Sprintf("%s %s %s", parts[2], operator, value)
			adhocConditions = append(adhocConditions, condition)
		}
		if len(adhocConditions) > 0 {
			whereAst := ast.Obj["where"].(*eval.EvalAST)
			if len(whereAst.Arr) == 0 && len(whereAst.Obj) == 0 {
				whereAst.Arr = append(whereAst.Arr, strings.Join(adhocConditions, " AND "))
			} else {
				whereArr := whereAst.Arr
				updatedWhereArr := make([]interface{}, 0, len(whereArr)+2)
				updatedWhereArr = append(updatedWhereArr, "(")
				updatedWhereArr = append(updatedWhereArr, whereArr...)
				updatedWhereArr = append(updatedWhereArr, ")")
				updatedWhereArr = append(updatedWhereArr, "AND")
				updatedWhereArr = append(updatedWhereArr, "(")
				updatedWhereArr = append(updatedWhereArr, strings.Join(adhocConditions, " AND "))
				updatedWhereArr = append(updatedWhereArr, ")")
				whereAst.Arr = updatedWhereArr
			}
		}
	}
	newQuery := eval.PrintAST(topQueryAst, " ")
	return map[string]interface{}{"query": newQuery}
}

// JS: createQuery(reqData)
func createQueryJS(this *js.Object, args []*js.Object) interface{} {
	jsObj := args[0]
	var req QueryRequest
	js.Global.Call("Object.assign", &req, jsObj)
	from, err := time.Parse(time.RFC3339, req.TimeRange.From)
	if err != nil {
		return map[string]interface{}{"error": fmt.Sprintf("Invalid from time: %v", err)}
	}
	to, err := time.Parse(time.RFC3339, req.TimeRange.To)
	if err != nil {
		return map[string]interface{}{"error": fmt.Sprintf("Invalid to time: %v", err)}
	}
	evalQ := eval.EvalQuery{
		Query:                  req.Query,
		DateTimeCol:            req.DateColDataType,
		DateCol:                req.DateColDataType,
		DateTimeType:           req.DateTimeType,
		Database:               req.Database,
		Table:                  req.Table,
		RawQuery:               req.RawQuery,
		Format:                 req.Format,
		Interval:               req.Interval,
		From:                   from,
		To:                     to,
		FrontendDatasource:     req.FrontendDatasource,
		UseWindowFuncForMacros: req.UseWindowFuncForMacros,
	}
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		return map[string]interface{}{"error": fmt.Sprintf("Failed to apply macros: %v", err)}
	}
	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		return map[string]interface{}{"error": fmt.Sprintf("Failed to parse query: %v", err)}
	}
	properties := findGroupByProperties(ast)
	return map[string]interface{}{"sql": sql, "keys": properties}
}

func findGroupByProperties(ast *eval.EvalAST) []interface{} {
	properties := make([]interface{}, 0)
	if ast != nil && ast.HasOwnProperty("group by") {
		groupByAst, ok := ast.Obj["group by"].(*eval.EvalAST)
		if ok && groupByAst.Arr != nil {
			for _, item := range groupByAst.Arr {
				properties = append(properties, item)
			}
		} else if groupBy, ok := ast.Obj["group by"].([]interface{}); ok {
			properties = append(properties, groupBy...)
		}
	}
	if ast != nil {
		for _, value := range ast.Obj {
			if nestedAst, ok := value.(*eval.EvalAST); ok {
				nestedProperties := findGroupByProperties(nestedAst)
				properties = append(properties, nestedProperties...)
			}
		}
	}
	return properties
}

// JS: replaceTimeFilters(reqData)
func replaceTimeFiltersJS(this *js.Object, args []*js.Object) interface{} {
	jsObj := args[0]
	query := jsObj.Get("query").String()
	dateTimeType := jsObj.Get("dateTimeType").String()
	timeRange := jsObj.Get("timeRange")
	fromStr := timeRange.Get("from").String()
	toStr := timeRange.Get("to").String()
	from, err := time.Parse(time.RFC3339, fromStr)
	if err != nil {
		return map[string]interface{}{"error": "Invalid from time", "data": from}
	}
	to, err := time.Parse(time.RFC3339, toStr)
	if err != nil {
		return map[string]interface{}{"error": "Invalid to time", "data": to}
	}
	evalQ := eval.EvalQuery{
		Query:        query,
		From:         from,
		To:           to,
		DateTimeType: dateTimeType,
	}
	sql := evalQ.ReplaceTimeFilters(evalQ.Query, 0)
	return map[string]interface{}{"sql": sql}
}

// JS: getAstProperty(query, propertyName)
func getAstPropertyJS(this *js.Object, args []*js.Object) interface{} {
	if len(args) != 2 {
		return map[string]interface{}{"error": "Invalid number of arguments. Expected query and propertyName"}
	}
	query := args[0].String()
	propertyName := args[1].String()
	scanner := eval.NewScanner(query)
	ast, err := scanner.ToAST()
	if err != nil {
		return map[string]interface{}{"error": fmt.Sprintf("Failed to parse query: %v", err)}
	}
	if propertyName == "group by" {
		properties := findGroupByProperties(ast)
		return map[string]interface{}{"properties": properties}
	}
	var properties []interface{}
	if prop, exists := ast.Obj[propertyName]; exists {
		switch v := prop.(type) {
		case *eval.EvalAST:
			properties = make([]interface{}, len(v.Arr))
			copy(properties, v.Arr)
		case []interface{}:
			properties = v
		case map[string]interface{}:
			properties = []interface{}{v}
		default:
			properties = []interface{}{v}
		}
	}
	return map[string]interface{}{"properties": properties}
}

func main() {
	js.Global.Set("applyAdhocFilters", js.MakeFunc(applyAdhocFiltersJS))
	js.Global.Set("createQuery", js.MakeFunc(createQueryJS))
	js.Global.Set("replaceTimeFilters", js.MakeFunc(replaceTimeFiltersJS))
	js.Global.Set("getAstProperty", js.MakeFunc(getAstPropertyJS))
	select {} // keep alive
}
