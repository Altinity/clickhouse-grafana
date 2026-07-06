package requests

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
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

// SendJSON marshals payload and sends it with the given status. On marshal
// failure it logs and sends a 500 error body instead of silently sending
// nothing.
func SendJSON(sender backend.CallResourceResponseSender, status int, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		log.DefaultLogger.Error("response marshal failed", "error", err)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   []byte(fmt.Sprintf(`{"error": "response marshal failed: %v"}`, err)),
		})
	}
	return sender.Send(&backend.CallResourceResponse{
		Status:  status,
		Headers: map[string][]string{"Content-Type": {"application/json"}},
		Body:    body,
	})
}

// SendSuccessResponse marshals response and sends it with proper headers
func SendSuccessResponse[T any](sender backend.CallResourceResponseSender, response T) error {
	return SendJSON(sender, http.StatusOK, response)
}