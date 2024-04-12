package data

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJSONNotice(t *testing.T) {
	tests := []struct {
		name   string
		notice Notice
		json   string
	}{
		{
			name: "notice with severity and text",
			notice: Notice{
				Severity: NoticeSeverityError,
				Text:     "Some text",
			},
			json: `{"severity":"error","text":"Some text"}`,
		},
	}
	for i := range tests {
		tt := tests[i]
		t.Run(tt.name, func(t *testing.T) {
			b, err := json.Marshal(tt.notice)
			require.NoError(t, err)
			require.Equal(t, tt.json, string(b))

			n := Notice{}
			err = json.Unmarshal([]byte(tt.json), &n)
			require.NoError(t, err)
			require.Equal(t, tt.notice, n)
		})
	}
}

func TestFrameMetaFromJSON(t *testing.T) {
	tests := []struct {
		name    string
		jsonStr string
		want    *FrameMeta
		wantErr error
	}{
		{
			name:    "empty json should not throw any error",
			jsonStr: `{}`,
			want:    &FrameMeta{},
		},
		{
			name:    "valid dataTopic should parse correctly",
			jsonStr: `{ "dataTopic" : "annotations" }`,
			want:    &FrameMeta{DataTopic: DataTopicAnnotations},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FrameMetaFromJSON(tt.jsonStr)
			if tt.wantErr != nil {
				require.NotNil(t, err)
				assert.Equal(t, tt.wantErr, err)
				return
			}
			require.Nil(t, err)
			require.NotNil(t, got)
			assert.Equal(t, tt.want, got)
		})
	}
}
