package actions

import "context"

// ActionCommand write the values
type ActionCommand struct {
	ID      string      `json:"id,omitempty"`      // Identify the command (optional)
	Path    string      `json:"path,omitempty"`    // Path for the value
	Value   interface{} `json:"value,omitempty"`   // Write values
	Comment string      `json:"comment,omitempty"` // Write all values or
	From    string      `json:"from,omitempty"`    // optional say where the command was listed from
}

type ActionResponse struct {
	Code  int         `json:"code,omitempty"` // Match HTTP response code
	Error string      `json:"error,omitempty"`
	State interface{} `json:"state,omitempty"`
}

type ActionHandler interface {
	ExecuteAction(ctx context.Context, cmd ActionCommand) ActionResponse
}
