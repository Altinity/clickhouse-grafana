package resource

import (
	"encoding/json"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// SendPlainText sends a plain text response.
func SendPlainText(sender backend.CallResourceResponseSender, text string) error {
	return sendResourceResponse(
		sender,
		http.StatusOK,
		map[string][]string{
			"content-type": {"text/plain"},
		},
		[]byte(text),
	)
}

// SendJSON sends a JSON response.
func SendJSON(sender backend.CallResourceResponseSender, obj interface{}) error {
	body, err := json.Marshal(obj)
	if err != nil {
		return err
	}
	return sendResourceResponse(
		sender,
		http.StatusOK,
		map[string][]string{
			"content-type": {"application/json"},
		},
		body,
	)
}

func sendResourceResponse(
	sender backend.CallResourceResponseSender,
	status int,
	headers map[string][]string,
	body []byte,
) error {
	return sender.Send(&backend.CallResourceResponse{
		Status:  status,
		Headers: headers,
		Body:    body,
	})
}
