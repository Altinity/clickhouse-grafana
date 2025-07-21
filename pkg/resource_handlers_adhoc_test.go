package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

// TestCreateQueryWithAdhoc_EmptyFilters tests the fix for issue #804
// Ensures $adhoc macro is replaced even when no adhoc filters are provided
func TestCreateQueryWithAdhoc_EmptyFilters(t *testing.T) {
	tests := []struct {
		name           string
		query          string
		adhocFilters   []AdhocFilter
		expectedSQL    string
		shouldContain  string
		shouldNotContain string
	}{
		{
			name:           "Empty filters should replace $adhoc with 1",
			query:          "SELECT 1 FROM system.users WHERE $adhoc",
			adhocFilters:   []AdhocFilter{}, // No filters
			expectedSQL:    "SELECT 1 FROM system.users WHERE 1",
			shouldContain:  "WHERE 1",
			shouldNotContain: "$adhoc",
		},
		{
			name:           "Nil filters should replace $adhoc with 1",
			query:          "SELECT * FROM logs WHERE status = 'active' AND $adhoc",
			adhocFilters:   nil,
			expectedSQL:    "SELECT * FROM logs WHERE status = 'active' AND 1",
			shouldContain:  "AND 1",
			shouldNotContain: "$adhoc",
		},
		{
			name: "With filters should replace $adhoc with conditions",
			query: "SELECT * FROM events WHERE $adhoc",
			adhocFilters: []AdhocFilter{
				{Key: "status", Operator: "=", Value: "active"},
				{Key: "role", Operator: "=", Value: "admin"},
			},
			expectedSQL:      "SELECT * FROM events WHERE (status = 'active' AND role = 'admin')",
			shouldContain:    "WHERE (status = 'active' AND role = 'admin')",
			shouldNotContain: "$adhoc",
		},
		{
			name:           "Multiple $adhoc macros should all be replaced",
			query:          "SELECT * FROM (SELECT * FROM table1 WHERE $adhoc) UNION (SELECT * FROM table2 WHERE $adhoc)",
			adhocFilters:   []AdhocFilter{},
			expectedSQL:    "SELECT * FROM (SELECT * FROM table1 WHERE 1) UNION (SELECT * FROM table2 WHERE 1)",
			shouldContain:  "WHERE 1",
			shouldNotContain: "$adhoc",
		},
		{
			name:           "Query without $adhoc should remain unchanged",
			query:          "SELECT 1 FROM system.users WHERE status = 'active'",
			adhocFilters:   []AdhocFilter{},
			expectedSQL:    "SELECT 1 FROM system.users WHERE status = 'active'",
			shouldContain:  "WHERE status = 'active'",
			shouldNotContain: "$adhoc",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create datasource instance
			ds := &ClickHouseDatasource{}

			// Create request
			request := CreateQueryWithAdhocRequest{
				RefId:                  "A",
				RuleUid:                "",
				RawQuery:               false,
				Query:                  tt.query,
				DateTimeColDataType:    "DATETIME",
				DateColDataType:        "",
				DateTimeType:           "DATETIME",
				Extrapolate:            false,
				SkipComments:           false,
				AddMetadata:            false,
				Format:                 "time_series",
				Round:                  "0s",
				IntervalFactor:         1,
				Interval:               "30s",
				Database:               "default",
				Table:                  "test_table",
				MaxDataPoints:          1000,
				TimeRange: TimeRange{
					From: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
					To:   time.Now().Format(time.RFC3339),
				},
				FrontendDatasource:     true,
				UseWindowFuncForMacros: false,
				AdhocFilters:           tt.adhocFilters,
				Target: Target{
					Database: "default",
					Table:    "test_table",
				},
			}

			// Marshal request to JSON
			reqBody, err := json.Marshal(request)
			require.NoError(t, err)

			// Create backend request
			backendReq := &backend.CallResourceRequest{
				Path:   "createQueryWithAdhoc",
				Method: "POST",
				Body:   reqBody,
			}

			// Create response sender mock
			var responseBody []byte
			var responseStatus int
			sender := &mockCallResourceResponseSender{
				sendFunc: func(resp *backend.CallResourceResponse) error {
					responseBody = resp.Body
					responseStatus = resp.Status
					return nil
				},
			}

			// Execute the handler
			ctx := context.Background()
			err = ds.handleCreateQueryWithAdhoc(ctx, backendReq, sender)
			require.NoError(t, err)

			// Verify response status
			require.Equal(t, http.StatusOK, responseStatus)

			// Parse response
			var response CreateQueryWithAdhocResponse
			err = json.Unmarshal(responseBody, &response)
			require.NoError(t, err)

			// Verify no error in response
			require.Empty(t, response.Error, "Expected no error in response")

			// Verify SQL content
			if tt.shouldContain != "" {
				require.Contains(t, response.SQL, tt.shouldContain, 
					"Expected SQL to contain '%s', got: %s", tt.shouldContain, response.SQL)
			}
			
			if tt.shouldNotContain != "" {
				require.NotContains(t, response.SQL, tt.shouldNotContain,
					"Expected SQL to NOT contain '%s', got: %s", tt.shouldNotContain, response.SQL)
			}

			// If we have an expected SQL, do exact match (ignoring whitespace differences)
			if tt.expectedSQL != "" {
				// Normalize whitespace for comparison
				normalizeSQL := func(sql string) string {
					return bytes.Join(bytes.Fields([]byte(sql)), []byte(" "))
				}
				
				expectedNormalized := string(normalizeSQL(tt.expectedSQL))
				actualNormalized := string(normalizeSQL(response.SQL))
				
				require.Equal(t, expectedNormalized, actualNormalized,
					"SQL mismatch.\nExpected: %s\nActual: %s", tt.expectedSQL, response.SQL)
			}
		})
	}
}

// TestCreateQueryWithAdhoc_FilterProcessing tests that adhoc filters are properly processed
func TestCreateQueryWithAdhoc_FilterProcessing(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		adhocFilters []AdhocFilter
		expectedContains []string
	}{
		{
			name:  "String filter with equals operator",
			query: "SELECT * FROM events WHERE $adhoc",
			adhocFilters: []AdhocFilter{
				{Key: "status", Operator: "=", Value: "active"},
			},
			expectedContains: []string{"status = 'active'"},
		},
		{
			name:  "Numeric filter without quotes",
			query: "SELECT * FROM events WHERE $adhoc",
			adhocFilters: []AdhocFilter{
				{Key: "count", Operator: ">", Value: 100},
			},
			expectedContains: []string{"count > 100"},
		},
		{
			name:  "Like operator conversion",
			query: "SELECT * FROM events WHERE $adhoc",
			adhocFilters: []AdhocFilter{
				{Key: "message", Operator: "=~", Value: "error%"},
			},
			expectedContains: []string{"message LIKE 'error%'"},
		},
		{
			name:  "Not like operator conversion",
			query: "SELECT * FROM events WHERE $adhoc",
			adhocFilters: []AdhocFilter{
				{Key: "message", Operator: "!~", Value: "debug%"},
			},
			expectedContains: []string{"message NOT LIKE 'debug%'"},
		},
		{
			name:  "Multiple filters with AND",
			query: "SELECT * FROM events WHERE $adhoc",
			adhocFilters: []AdhocFilter{
				{Key: "status", Operator: "=", Value: "active"},
				{Key: "level", Operator: "=", Value: "info"},
			},
			expectedContains: []string{"status = 'active'", "level = 'info'", "AND"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ds := &ClickHouseDatasource{}

			request := CreateQueryWithAdhocRequest{
				RefId:    "A",
				Query:    tt.query,
				Database: "default",
				Table:    "events",
				TimeRange: TimeRange{
					From: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
					To:   time.Now().Format(time.RFC3339),
				},
				AdhocFilters: tt.adhocFilters,
				Target: Target{
					Database: "default",
					Table:    "events",
				},
			}

			reqBody, err := json.Marshal(request)
			require.NoError(t, err)

			backendReq := &backend.CallResourceRequest{
				Path:   "createQueryWithAdhoc",
				Method: "POST",
				Body:   reqBody,
			}

			var responseBody []byte
			sender := &mockCallResourceResponseSender{
				sendFunc: func(resp *backend.CallResourceResponse) error {
					responseBody = resp.Body
					return nil
				},
			}

			ctx := context.Background()
			err = ds.handleCreateQueryWithAdhoc(ctx, backendReq, sender)
			require.NoError(t, err)

			var response CreateQueryWithAdhocResponse
			err = json.Unmarshal(responseBody, &response)
			require.NoError(t, err)

			require.Empty(t, response.Error)

			for _, expectedContent := range tt.expectedContains {
				require.Contains(t, response.SQL, expectedContent,
					"Expected SQL to contain '%s', got: %s", expectedContent, response.SQL)
			}
		})
	}
}

// TestCreateQueryWithAdhoc_QueryWithoutAdhoc tests that queries without $adhoc work normally
func TestCreateQueryWithAdhoc_QueryWithoutAdhoc(t *testing.T) {
	ds := &ClickHouseDatasource{}

	request := CreateQueryWithAdhocRequest{
		RefId:    "A",
		Query:    "SELECT * FROM events WHERE status = 'active'", // No $adhoc macro
		Database: "default",
		Table:    "events",
		TimeRange: TimeRange{
			From: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			To:   time.Now().Format(time.RFC3339),
		},
		AdhocFilters: []AdhocFilter{
			{Key: "level", Operator: "=", Value: "info"}, // These should be added to WHERE
		},
		Target: Target{
			Database: "default",
			Table:    "events",
		},
	}

	reqBody, err := json.Marshal(request)
	require.NoError(t, err)

	backendReq := &backend.CallResourceRequest{
		Path:   "createQueryWithAdhoc",
		Method: "POST",
		Body:   reqBody,
	}

	var responseBody []byte
	sender := &mockCallResourceResponseSender{
		sendFunc: func(resp *backend.CallResourceResponse) error {
			responseBody = resp.Body
			return nil
		},
	}

	ctx := context.Background()
	err = ds.handleCreateQueryWithAdhoc(ctx, backendReq, sender)
	require.NoError(t, err)

	var response CreateQueryWithAdhocResponse
	err = json.Unmarshal(responseBody, &response)
	require.NoError(t, err)

	require.Empty(t, response.Error)
	
	// Should contain original WHERE clause and new filter
	require.Contains(t, response.SQL, "status = 'active'")
	require.Contains(t, response.SQL, "level = 'info'")
	require.Contains(t, response.SQL, "AND")
	require.NotContains(t, response.SQL, "$adhoc")
}

// Mock implementation of CallResourceResponseSender for testing
type mockCallResourceResponseSender struct {
	sendFunc func(*backend.CallResourceResponse) error
}

func (m *mockCallResourceResponseSender) Send(resp *backend.CallResourceResponse) error {
	return m.sendFunc(resp)
}