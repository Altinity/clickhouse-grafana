package actions

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func DoActionCommand(ctx context.Context, req *backend.CallResourceRequest, handler ActionHandler, sender backend.CallResourceResponseSender) error {
	rsp := ActionResponse{}
	cmd := &ActionCommand{}

	if req.Method == "POST" {
		if err := json.Unmarshal(req.Body, cmd); err != nil {
			return fmt.Errorf("error read")
		}
		rsp = handler.ExecuteAction(ctx, *cmd)
	} else {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusMethodNotAllowed,
			Body:   []byte("Expects GET|POST"),
		})
	}

	json, err := json.Marshal(rsp)
	if err != nil {
		return err
	}

	// Log results somewhere
	backend.Logger.Info("ACTION", "user", req.PluginContext.User, "cmd", cmd, "result", rsp)

	return sender.Send(&backend.CallResourceResponse{
		Status: rsp.Code,
		Body:   json,
	})
}
