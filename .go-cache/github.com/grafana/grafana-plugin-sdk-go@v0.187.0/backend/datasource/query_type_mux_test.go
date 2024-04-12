package datasource

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestQueryTypeMux(t *testing.T) {
	mux := NewQueryTypeMux()
	aHandler := &testHandler{}
	mux.Handle("a", aHandler)
	bHandler := &testHandler{}
	mux.Handle("b", bHandler)

	res, err := mux.QueryData(context.Background(), &backend.QueryDataRequest{
		Queries: []backend.DataQuery{
			{
				RefID:     "A",
				QueryType: "a",
			},
			{
				RefID:     "B",
				QueryType: "b",
			},
			{
				RefID:     "C",
				QueryType: "a",
			},
			{
				RefID:     "D",
				QueryType: "d",
			},
		},
	})

	require.NoError(t, err)
	require.Equal(t, 1, aHandler.callCount)
	require.Len(t, aHandler.request.Queries, 2)
	require.Equal(t, "A", aHandler.request.Queries[0].RefID)
	require.Equal(t, "C", aHandler.request.Queries[1].RefID)

	require.Equal(t, 1, bHandler.callCount)
	require.Len(t, bHandler.request.Queries, 1)
	require.Equal(t, "B", bHandler.request.Queries[0].RefID)
	require.Len(t, res.Responses, 4)
	require.Equal(t, "no handler found for query type 'd'", res.Responses["D"].Error.Error())

	t.Run("When overriding fallback handler should call fallback handler", func(t *testing.T) {
		errBoom := errors.New("BOOM")
		mux.HandleFunc("", func(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
			return nil, errBoom
		})
		res, err = mux.QueryData(context.Background(), &backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID:     "A",
					QueryType: "unhandled",
				},
			},
		})

		require.Nil(t, res)
		require.Error(t, err)
		require.Equal(t, errBoom, err)
	})
}

type testHandler struct {
	callCount int
	request   *backend.QueryDataRequest
}

func (th *testHandler) QueryData(_ context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	th.callCount++
	th.request = req
	responses := backend.Responses{}
	for _, q := range req.Queries {
		responses[q.RefID] = backend.DataResponse{}
	}

	return &backend.QueryDataResponse{
		Responses: responses,
	}, nil
}
