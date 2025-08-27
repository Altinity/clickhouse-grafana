package requests

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// UnmarshalRequest unmarshals JSON request body into the specified type with error handling
func UnmarshalRequest[T any](req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) (*T, bool) {
	var request T
	if err := json.Unmarshal(req.Body, &request); err != nil {
		sender.Send(&backend.CallResourceResponse{
			Status: http.StatusBadRequest,
			Body:   []byte(fmt.Sprintf(`{"error": "Invalid request: %v"}`, err)),
		})
		return nil, false // false = error occurred
	}
	return &request, true // true = success
}

// SendSuccessResponse marshals response and sends it with proper headers
func SendSuccessResponse[T any](sender backend.CallResourceResponseSender, response T) error {
	body, _ := json.Marshal(response)
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}