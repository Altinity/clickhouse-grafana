package main

type targetResponseDTO struct {
	Meta []meta                   `json:"meta"`
	Data []map[string]interface{} `json:"data"`
	Rows int                      `json:"rows"`
}

type meta struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type queryModel struct {
	Raw   string `json:"rawQuery"`
	RefID string `json:"refId"`
}
