package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

type captureSender struct{ resp *backend.CallResourceResponse }

func (s *captureSender) Send(r *backend.CallResourceResponse) error { s.resp = r; return nil }

func callResource(t *testing.T, path string, body interface{}) *backend.CallResourceResponse {
	t.Helper()
	var raw []byte
	if s, ok := body.(string); ok {
		raw = []byte(s)
	} else {
		var err error
		raw, err = json.Marshal(body)
		require.NoError(t, err)
	}
	sender := &captureSender{}
	ds := &ClickHouseDatasource{}
	require.NoError(t, ds.CallResource(context.Background(), &backend.CallResourceRequest{Path: path, Body: raw}, sender))
	require.NotNil(t, sender.resp)
	return sender.resp
}

func decodeBody(t *testing.T, resp *backend.CallResourceResponse) map[string]interface{} {
	t.Helper()
	var m map[string]interface{}
	require.NoError(t, json.Unmarshal(resp.Body, &m))
	return m
}

func mustAST(t *testing.T, sql string) *eval.EvalAST {
	t.Helper()
	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	require.NoError(t, err)
	return ast
}

var testTimeRange = map[string]string{"from": "2024-01-01T00:00:00Z", "to": "2024-01-02T00:00:00Z"}

func TestParseTargets(t *testing.T) {
	tests := []struct {
		name         string
		from         string
		wantDatabase string
		wantTable    string
	}{
		{"empty", "", "", ""},
		{"table only uses default db", "tbl", "defaultDB", "tbl"},
		{"db and table", "db.tbl", "db", "tbl"},
		{"too many parts", "a.b.c", "", ""},
		{"$table replaced", "$table", "defaultDB", "defaultTable"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, table := parseTargets(tt.from, "defaultDB", "defaultTable")
			require.Equal(t, tt.wantDatabase, db)
			require.Equal(t, tt.wantTable, table)
		})
	}
}

func TestFindGroupByProperties(t *testing.T) {
	tests := []struct {
		name string
		ast  *eval.EvalAST
		want []interface{}
	}{
		{"top level", mustAST(t, "SELECT x FROM default.test GROUP BY host, ip"), []interface{}{"host", "ip"}},
		{"subquery", mustAST(t, "SELECT x FROM (SELECT x FROM default.test GROUP BY host)"), []interface{}{"host"}},
		{"none", mustAST(t, "SELECT x FROM default.test"), []interface{}{}},
		{"slice value", &eval.EvalAST{Obj: map[string]interface{}{"group by": []interface{}{"a"}}}, []interface{}{"a"}},
		{"scalar value", &eval.EvalAST{Obj: map[string]interface{}{"group by": "a"}}, []interface{}{"a"}},
		{"nested in non-from key", &eval.EvalAST{Obj: map[string]interface{}{
			"foo": &eval.EvalAST{Obj: map[string]interface{}{"group by": "b"}},
		}}, []interface{}{"b"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, findGroupByProperties(tt.ast))
		})
	}
}

func TestFindUnreplacedMacros(t *testing.T) {
	got := findUnreplacedMacros("SELECT $timeSeries FROM $table WHERE $timeFilter AND $adhoc")
	require.Len(t, got, 4)
	require.Empty(t, findUnreplacedMacros("SELECT 1 FROM t"))
}

func TestCreateUniversalErrorResponse(t *testing.T) {
	tests := []struct {
		name        string
		ctx         ErrorContext
		wantMsgPart string
		wantSQLKey  bool
	}{
		{"time range", ErrorContext{ErrorType: ErrorTypeTimeRange, OriginalError: fmt.Errorf("bad")}, "Time range processing failed", false},
		{"macro expansion with unreplaced", ErrorContext{ErrorType: ErrorTypeMacroExpansion, OriginalSQL: "SELECT $timeFilter", OriginalError: fmt.Errorf("bad")}, "Found unreplaced macros", false},
		{"macro expansion clean", ErrorContext{ErrorType: ErrorTypeMacroExpansion, OriginalSQL: "SELECT 1", OriginalError: fmt.Errorf("bad")}, "check your macro syntax", false},
		{"query parsing with adhoc", ErrorContext{ErrorType: ErrorTypeQueryParsing, OriginalSQL: "SELECT * WHERE $adhoc", HasAdhocMacro: true, OriginalError: fmt.Errorf("bad")}, "replaced with '1' as a fallback", true},
		{"query parsing with unreplaced", ErrorContext{ErrorType: ErrorTypeQueryParsing, OriginalSQL: "SELECT $timeSeries", OriginalError: fmt.Errorf("bad")}, "Found unreplaced macros", false},
		{"query parsing clean", ErrorContext{ErrorType: ErrorTypeQueryParsing, OriginalSQL: "SELECT 1", OriginalError: fmt.Errorf("bad")}, "check your SQL syntax", false},
		{"from clause with adhoc", ErrorContext{ErrorType: ErrorTypeFromClause, OriginalSQL: "SELECT * WHERE $adhoc", HasAdhocMacro: true, OriginalError: fmt.Errorf("bad")}, "Cannot determine target table", true},
		{"from clause plain", ErrorContext{ErrorType: ErrorTypeFromClause, OriginalError: fmt.Errorf("bad")}, "FROM clause parsing failed", false},
		{"adhoc filters", ErrorContext{ErrorType: ErrorTypeAdhocFilters, OriginalError: fmt.Errorf("bad")}, "Adhoc filter processing failed", false},
		{"ast extraction", ErrorContext{ErrorType: ErrorTypeAstExtraction, OriginalError: fmt.Errorf("bad")}, "AST property extraction failed", false},
		{"general with unreplaced", ErrorContext{ErrorType: ErrorTypeGeneral, OriginalSQL: "SELECT $from", OriginalError: fmt.Errorf("boom")}, "unreplaced macros", false},
		{"general clean", ErrorContext{ErrorType: ErrorTypeGeneral, OriginalSQL: "SELECT 1", OriginalError: fmt.Errorf("boom")}, "boom", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, processedSQL := createUniversalErrorResponse(tt.ctx)
			require.Contains(t, resp["error"].(string), tt.wantMsgPart)
			require.NotContains(t, processedSQL, "$adhoc")
			_, hasSQL := resp["sql"]
			require.Equal(t, tt.wantSQLKey, hasSQL)
			if hasSQL {
				require.NotContains(t, resp["sql"].(string), "$adhoc")
			}
		})
	}
}

func TestCallResourceUnknownPath(t *testing.T) {
	resp := callResource(t, "nope", `{}`)
	require.Equal(t, http.StatusNotFound, resp.Status)
	require.Contains(t, string(resp.Body), "Resource not found")
}

func TestCallResourceMalformedBody(t *testing.T) {
	for _, path := range []string{"createQuery", "applyAdhocFilters", "getAstProperty", "replaceTimeFilters", "processQueryBatch", "createQueryWithAdhoc", "getMultipleAstProperties"} {
		t.Run(path, func(t *testing.T) {
			resp := callResource(t, path, `{not json`)
			require.Equal(t, http.StatusBadRequest, resp.Status)
			require.Contains(t, string(resp.Body), "Invalid request")
		})
	}
}

func TestHandleCreateQuery(t *testing.T) {
	base := map[string]interface{}{
		"query":               "SELECT $timeSeries as t, count() FROM default.test WHERE $timeFilter GROUP BY t",
		"dateTimeColDataType": "event_time",
		"dateTimeType":        "DATETIME",
		"interval":            "30s",
		"database":            "default",
		"table":               "test",
		"timeRange":           testTimeRange,
	}

	t.Run("happy path", func(t *testing.T) {
		resp := callResource(t, "createQuery", base)
		require.Equal(t, http.StatusOK, resp.Status)
		body := decodeBody(t, resp)
		require.NotContains(t, body["sql"], "$timeSeries")
		require.NotContains(t, body["sql"], "$timeFilter")
		require.Contains(t, body["sql"], "FROM default.test")
		require.Equal(t, []interface{}{"t"}, body["keys"])
	})

	t.Run("invalid time range", func(t *testing.T) {
		req := map[string]interface{}{"query": "SELECT 1", "timeRange": map[string]string{"from": "bad", "to": "bad"}}
		resp := callResource(t, "createQuery", req)
		require.Equal(t, http.StatusBadRequest, resp.Status)
		require.Contains(t, decodeBody(t, resp)["error"], "Time range processing failed")
	})

	t.Run("macro failure", func(t *testing.T) {
		req := map[string]interface{}{"query": "SELECT 1 FROM t", "interval": "xs", "timeRange": testTimeRange}
		resp := callResource(t, "createQuery", req)
		require.Equal(t, http.StatusInternalServerError, resp.Status)
		require.Contains(t, decodeBody(t, resp)["error"], "Macro expansion failed")
	})
}

func TestHandleApplyAdhocFilters(t *testing.T) {
	filters := []map[string]interface{}{{"key": "b", "operator": "=", "value": "2"}}
	target := map[string]string{"database": "default", "table": "test"}

	tests := []struct {
		name       string
		body       map[string]interface{}
		wantStatus int
		wantQuery  []string
		wantErr    string
	}{
		{
			"inject into existing WHERE",
			map[string]interface{}{"query": "SELECT x FROM default.test WHERE a = 1", "adhocFilters": filters, "target": target},
			http.StatusOK, []string{"WHERE", "a = 1", "AND", "(b = 2)"}, "",
		},
		{
			"inject creates WHERE",
			map[string]interface{}{"query": "SELECT x FROM default.test", "adhocFilters": filters, "target": target},
			http.StatusOK, []string{"WHERE", "b = 2"}, "",
		},
		{
			"string value quoted",
			map[string]interface{}{"query": "SELECT x FROM default.test", "adhocFilters": []map[string]interface{}{{"key": "b", "operator": "=", "value": "web"}}, "target": target},
			http.StatusOK, []string{"b = 'web'"}, "",
		},
		{
			"adhoc macro replaced with conditions",
			map[string]interface{}{"query": "SELECT x FROM default.test WHERE $adhoc", "adhocFilters": filters, "target": target},
			http.StatusOK, []string{"WHERE (b = 2)"}, "",
		},
		{
			"adhoc macro with no filters becomes 1",
			map[string]interface{}{"query": "SELECT x FROM default.test WHERE $adhoc", "target": target},
			http.StatusOK, []string{"WHERE 1"}, "",
		},
		{
			"subquery FROM",
			map[string]interface{}{"query": "SELECT x FROM (SELECT y FROM default.test)", "adhocFilters": filters, "target": target},
			http.StatusOK, []string{"WHERE b = 2"}, "",
		},
		{
			"parse error",
			map[string]interface{}{"query": "SELECT x FROM tbl INNER JOIN", "adhocFilters": filters, "target": target},
			http.StatusInternalServerError, nil, "Query parsing failed",
		},
		{
			"unparseable FROM clause",
			map[string]interface{}{"query": "SELECT x FROM a.b.c", "adhocFilters": filters, "target": target},
			http.StatusInternalServerError, nil, "FROM clause parsing failed",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := callResource(t, "applyAdhocFilters", tt.body)
			require.Equal(t, tt.wantStatus, resp.Status)
			body := decodeBody(t, resp)
			if tt.wantErr != "" {
				require.Contains(t, body["error"], tt.wantErr)
				return
			}
			for _, part := range tt.wantQuery {
				require.Contains(t, body["query"], part)
			}
			require.NotContains(t, body["query"], "$adhoc")
		})
	}
}

func TestHandleReplaceTimeFilters(t *testing.T) {
	t.Run("happy path", func(t *testing.T) {
		body := map[string]interface{}{
			"query":        "SELECT x FROM t WHERE d >= toDateTime($from) AND d <= toDateTime($to)",
			"dateTimeType": "DATETIME",
			"timeRange":    testTimeRange,
		}
		resp := callResource(t, "replaceTimeFilters", body)
		require.Equal(t, http.StatusOK, resp.Status)
		sql := decodeBody(t, resp)["sql"].(string)
		require.NotContains(t, sql, "$from")
		require.NotContains(t, sql, "$to")
		require.Contains(t, sql, "1704067200")
	})

	for _, tt := range []struct{ name, from, to, wantErr string }{
		{"bad from", "bad", "2024-01-02T00:00:00Z", "Invalid from time"},
		{"bad to", "2024-01-01T00:00:00Z", "bad", "Invalid to time"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			body := map[string]interface{}{"query": "SELECT 1", "timeRange": map[string]string{"from": tt.from, "to": tt.to}}
			resp := callResource(t, "replaceTimeFilters", body)
			require.Equal(t, http.StatusBadRequest, resp.Status)
			require.Equal(t, tt.wantErr, decodeBody(t, resp)["error"])
		})
	}
}

func TestHandleGetAstProperty(t *testing.T) {
	query := "SELECT x, y FROM default.test WHERE a = 1 AND b = 2 GROUP BY host LIMIT 10"
	tests := []struct {
		name       string
		query      string
		property   string
		wantStatus int
		want       []interface{}
	}{
		{"group by recursive", "SELECT x FROM (SELECT x FROM default.test GROUP BY host)", "group by", http.StatusOK, []interface{}{"host"}},
		{"select", query, "select", http.StatusOK, []interface{}{"x", "y"}},
		{"where", query, "where", http.StatusOK, []interface{}{"a = 1", "AND b = 2"}},
		{"limit", query, "limit", http.StatusOK, []interface{}{"10"}},
		{"missing property", query, "having", http.StatusOK, nil},
		{"parse error", "SELECT x FROM tbl INNER JOIN", "select", http.StatusInternalServerError, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := callResource(t, "getAstProperty", map[string]string{"query": tt.query, "propertyName": tt.property})
			require.Equal(t, tt.wantStatus, resp.Status)
			body := decodeBody(t, resp)
			if tt.wantStatus != http.StatusOK {
				require.Contains(t, body["error"], "AST property extraction failed")
				return
			}
			if tt.want == nil {
				require.Empty(t, body["properties"])
			} else {
				require.Equal(t, tt.want, body["properties"])
			}
		})
	}
}

func TestHandleGetMultipleAstProperties(t *testing.T) {
	t.Run("mixed properties", func(t *testing.T) {
		body := map[string]interface{}{
			"query":      "SELECT x FROM default.test WHERE a = 1 GROUP BY host",
			"properties": []string{"group by", "where", "select", "having"},
		}
		resp := callResource(t, "getMultipleAstProperties", body)
		require.Equal(t, http.StatusOK, resp.Status)
		props := decodeBody(t, resp)["properties"].(map[string]interface{})
		require.Equal(t, []interface{}{"host"}, props["group by"])
		require.Equal(t, []interface{}{"a = 1"}, props["where"])
		require.Equal(t, []interface{}{"x"}, props["select"])
		require.Empty(t, props["having"])
	})

	t.Run("parse error", func(t *testing.T) {
		body := map[string]interface{}{"query": "SELECT x FROM tbl INNER JOIN", "properties": []string{"select"}}
		resp := callResource(t, "getMultipleAstProperties", body)
		require.Equal(t, http.StatusInternalServerError, resp.Status)
		require.Contains(t, decodeBody(t, resp)["error"], "Failed to parse query")
	})
}

func TestHandleProcessQueryBatch(t *testing.T) {
	filters := []map[string]interface{}{{"key": "b", "operator": "=", "value": "2"}}
	target := map[string]string{"database": "default", "table": "test"}
	base := func() map[string]interface{} {
		return map[string]interface{}{
			"query":               "SELECT $timeSeries as t, count() FROM default.test WHERE $timeFilter GROUP BY t LIMIT 10",
			"dateTimeColDataType": "event_time",
			"dateTimeType":        "DATETIME",
			"interval":            "30s",
			"database":            "default",
			"table":               "test",
			"timeRange":           testTimeRange,
			"target":              target,
		}
	}

	t.Run("happy path with property extraction", func(t *testing.T) {
		req := base()
		req["extractProperties"] = []string{"group by", "select", "where", "limit", "having"}
		resp := callResource(t, "processQueryBatch", req)
		require.Equal(t, http.StatusOK, resp.Status)
		body := decodeBody(t, resp)
		require.NotContains(t, body["sql"], "$timeFilter")
		require.Equal(t, []interface{}{"t"}, body["keys"])
		props := body["properties"].(map[string]interface{})
		require.Equal(t, []interface{}{"t"}, props["group by"])
		require.Equal(t, []interface{}{"10"}, props["limit"])
		require.NotEmpty(t, props["select"])
		require.NotEmpty(t, props["where"])
		require.Empty(t, props["having"])
	})

	t.Run("adhoc filters injected", func(t *testing.T) {
		req := base()
		req["adhocFilters"] = filters
		resp := callResource(t, "processQueryBatch", req)
		require.Equal(t, http.StatusOK, resp.Status)
		require.Contains(t, decodeBody(t, resp)["sql"], "(b = 2)")
	})

	t.Run("adhoc macro replaced", func(t *testing.T) {
		req := base()
		req["query"] = "SELECT $timeSeries as t, count() FROM default.test WHERE $timeFilter AND $adhoc GROUP BY t"
		req["adhocFilters"] = filters
		resp := callResource(t, "processQueryBatch", req)
		require.Equal(t, http.StatusOK, resp.Status)
		sql := decodeBody(t, resp)["sql"].(string)
		require.Contains(t, sql, "(b = 2)")
		require.NotContains(t, sql, "$adhoc")
	})

	t.Run("adhoc macro with non-matching filters becomes 1", func(t *testing.T) {
		req := base()
		req["query"] = "SELECT $timeSeries as t, count() FROM default.test WHERE $timeFilter AND $adhoc GROUP BY t"
		req["adhocFilters"] = []map[string]interface{}{{"key": "other.tbl.col", "operator": "=", "value": "2"}}
		resp := callResource(t, "processQueryBatch", req)
		require.Equal(t, http.StatusOK, resp.Status)
		sql := decodeBody(t, resp)["sql"].(string)
		require.Contains(t, sql, "AND 1")
		require.NotContains(t, sql, "$adhoc")
	})

	t.Run("unparseable FROM clause", func(t *testing.T) {
		req := base()
		req["query"] = "SELECT x FROM a.b.c WHERE $timeFilter"
		req["adhocFilters"] = filters
		resp := callResource(t, "processQueryBatch", req)
		require.Equal(t, http.StatusInternalServerError, resp.Status)
		require.Contains(t, decodeBody(t, resp)["error"], "FROM expression can't be parsed")
	})

	t.Run("macro failure", func(t *testing.T) {
		req := base()
		req["interval"] = "xs"
		resp := callResource(t, "processQueryBatch", req)
		require.Equal(t, http.StatusInternalServerError, resp.Status)
		require.Contains(t, decodeBody(t, resp)["error"], "Failed to apply macros")
	})

	for _, tt := range []struct{ name, from, to, wantErr string }{
		{"bad from", "bad", "2024-01-02T00:00:00Z", "Invalid `$from` time"},
		{"bad to", "2024-01-01T00:00:00Z", "bad", "Invalid `$to` time"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			req := base()
			req["timeRange"] = map[string]string{"from": tt.from, "to": tt.to}
			resp := callResource(t, "processQueryBatch", req)
			require.Equal(t, http.StatusBadRequest, resp.Status)
			require.Equal(t, tt.wantErr, decodeBody(t, resp)["error"])
		})
	}
}

func TestHandleCreateQueryWithAdhoc(t *testing.T) {
	filters := []map[string]interface{}{{"key": "b", "operator": "=", "value": "2"}}
	target := map[string]string{"database": "default", "table": "test"}
	base := func(query string) map[string]interface{} {
		return map[string]interface{}{
			"query":               query,
			"dateTimeColDataType": "event_time",
			"dateTimeType":        "DATETIME",
			"interval":            "30s",
			"database":            "default",
			"table":               "test",
			"timeRange":           testTimeRange,
			"target":              target,
		}
	}
	plain := "SELECT $timeSeries as t, count() FROM default.test WHERE $timeFilter GROUP BY t"
	withAdhoc := "SELECT $timeSeries as t, count() FROM default.test WHERE $timeFilter AND $adhoc GROUP BY t"

	tests := []struct {
		name       string
		body       map[string]interface{}
		mutate     func(map[string]interface{})
		wantStatus int
		wantSQL    []string
		wantErr    string
	}{
		{"no filters no adhoc", base(plain), nil, http.StatusOK, []string{"FROM default.test"}, ""},
		{"filters injected", base(plain), func(m map[string]interface{}) { m["adhocFilters"] = filters }, http.StatusOK, []string{"(b = 2)"}, ""},
		{"adhoc replaced with conditions", base(withAdhoc), func(m map[string]interface{}) { m["adhocFilters"] = filters }, http.StatusOK, []string{"(b = 2)"}, ""},
		{"adhoc no filters becomes 1", base(withAdhoc), nil, http.StatusOK, []string{"AND 1"}, ""},
		{
			"adhoc with non-matching filters becomes 1", base(withAdhoc),
			func(m map[string]interface{}) {
				m["adhocFilters"] = []map[string]interface{}{{"key": "other.tbl.col", "operator": "=", "value": "2"}}
			},
			http.StatusOK, []string{"AND 1"}, "",
		},
		{
			"unparseable FROM clause", base("SELECT x FROM a.b.c WHERE $timeFilter"),
			func(m map[string]interface{}) { m["adhocFilters"] = filters },
			http.StatusInternalServerError, nil, "FROM clause parsing failed",
		},
		{
			"macro failure", base(plain),
			func(m map[string]interface{}) { m["interval"] = "xs" },
			http.StatusInternalServerError, nil, "Macro expansion failed",
		},
		{
			"bad from", base(plain),
			func(m map[string]interface{}) {
				m["timeRange"] = map[string]string{"from": "bad", "to": "2024-01-02T00:00:00Z"}
			},
			http.StatusBadRequest, nil, "Invalid `$from` time",
		},
		{
			"bad to", base(plain),
			func(m map[string]interface{}) {
				m["timeRange"] = map[string]string{"from": "2024-01-01T00:00:00Z", "to": "bad"}
			},
			http.StatusBadRequest, nil, "Invalid `$to` time",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.mutate != nil {
				tt.mutate(tt.body)
			}
			resp := callResource(t, "createQueryWithAdhoc", tt.body)
			require.Equal(t, tt.wantStatus, resp.Status)
			body := decodeBody(t, resp)
			if tt.wantErr != "" {
				require.Contains(t, body["error"], tt.wantErr)
				return
			}
			for _, part := range tt.wantSQL {
				require.Contains(t, body["sql"], part)
			}
			require.NotContains(t, body["sql"], "$adhoc")
		})
	}
}
