package main

import (
	"context"
	"errors"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

func TestSafeDataResponseRecoversPanic(t *testing.T) {
	res := safeDataResponse("A", func() backend.DataResponse {
		var m map[string]int
		m["boom"] = 1
		return backend.DataResponse{}
	})
	require.Error(t, res.Error)
	require.Contains(t, res.Error.Error(), "internal plugin error while processing query A")

	ok := safeDataResponse("B", func() backend.DataResponse { return backend.DataResponse{} })
	require.NoError(t, ok.Error)
}

func TestParseFloatValueUnexpectedTypes(t *testing.T) {
	require.Equal(t, 0.0, parseFloatValue(true, false))
	require.Nil(t, parseFloatValue(map[string]interface{}{}, true))
	require.Equal(t, 1.5, parseFloatValue("1.5", false))
	require.Equal(t, 0.0, parseFloatValue("abc", false))
	require.Equal(t, 3.0, parseFloatValue(3, false))
	require.Equal(t, 2.5, parseFloatValue(2.5, false))
}

func TestNewDatasourceSettingsNonStringHeaderName(t *testing.T) {
	_, err := NewDatasourceSettings(context.Background(), backend.DataSourceInstanceSettings{
		JSONData: []byte(`{"httpHeaderName1": 123}`),
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "httpHeaderName1 must be a string")
}

func TestClickHouseHTTPErrorMessage(t *testing.T) {
	var err error = &ClickHouseHTTPError{StatusCode: 404, Body: "Code: 60. DB::Exception: Table default.x does not exist"}
	var httpErr *ClickHouseHTTPError
	require.True(t, errors.As(err, &httpErr))
	require.Equal(t, 404, httpErr.StatusCode)
	require.Equal(t, "Code: 60. DB::Exception: Table default.x does not exist", err.Error())
}
