package mock

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/e2e/storage"
)

type RoundTripper struct {
	// Response mock
	GetResponse func(req *http.Request) (*http.Response, error)
	HARFileName string // filename (relative path of where it is being called)
	GetFileName func(req *http.Request) string
	FileName    string // filename (relative path of where it is being called)
	GetBody     func(req *http.Request) string
	Body        string
	// Response status and headers
	StatusCode      int
	Status          string
	ResponseHeaders map[string]string
	// Authentication
	BasicAuthEnabled  bool
	BasicAuthUser     string
	BasicAuthPassword string
}

// RoundTrip provides a http transport method for simulating http response
// If GetResponse present and return non-nil values, they will be returned. This will be useful to mock authentication errors bases on request headers
// Else If HARFileName present, it will take priority
// Else if GetFileName present and return valid file name, it will respond with corresponding file content
// Else if FileName present, it will read the response from the filename
// Else if GetBody present and return valid string, it will respond with corresponding string
// Else if Body present, it will echo the body
// Else default response {} will be sent
func (rt *RoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	res := &http.Response{
		Request:    req,
		Header:     make(http.Header),
		StatusCode: http.StatusOK,
		Status:     "200 OK",
		Body:       io.NopCloser(bytes.NewBufferString("{}")),
	}
	if rt.GetResponse != nil {
		if res, err := rt.GetResponse(req); res != nil || err != nil {
			return res, err
		}
	}
	if rt.BasicAuthEnabled && (req.URL.User.String() != fmt.Sprintf("%s:%s", rt.BasicAuthUser, rt.BasicAuthPassword)) {
		res.StatusCode = 401
		res.Status = "401 Unauthorized"
		return res, nil
	}
	if rt.HARFileName != "" {
		storage := storage.NewHARStorage(rt.HARFileName)
		err := storage.Load()
		if err != nil {
			res.StatusCode = http.StatusNotImplemented
			res.Status = http.StatusText(http.StatusNotImplemented)
			res.Body = io.NopCloser(bytes.NewBufferString("no matching HAR files found"))
			return res, errors.New("no matching HAR files found")
		}
		matchedRequest := storage.Match(req)
		if matchedRequest == nil {
			res.StatusCode = http.StatusNotImplemented
			res.Status = http.StatusText(http.StatusNotImplemented)
			res.Body = io.NopCloser(bytes.NewBufferString("no matched request found in HAR file"))
			return res, errors.New("no matched request found in HAR file")
		}
		return matchedRequest, nil
	}
	fileName := rt.FileName
	if rt.GetFileName != nil {
		if newFileName := rt.GetFileName(req); newFileName != "" {
			fileName = newFileName
		}
	}
	if fileName != "" {
		b, err := os.ReadFile(fileName)
		if err != nil {
			return res, fmt.Errorf("error reading mock response file %s", fileName)
		}
		res.Body = io.NopCloser(bytes.NewReader(b))
		return rt.wrap(res), nil
	}
	body := rt.Body
	if rt.GetBody != nil {
		if newBody := rt.GetBody(req); newBody != "" {
			body = newBody
		}
	}
	if body != "" {
		res.Body = io.NopCloser(bytes.NewBufferString(body))
		return rt.wrap(res), nil
	}
	return rt.wrap(res), nil
}

func (rt *RoundTripper) wrap(res *http.Response) *http.Response {
	if rt.StatusCode != 0 {
		res.StatusCode = rt.StatusCode
	}
	if rt.Status != "" {
		res.Status = rt.Status
	}
	for key, value := range rt.ResponseHeaders {
		res.Header.Add(key, value)
	}
	return res
}

func GetMockHTTPClient(rt RoundTripper) *http.Client {
	h, _ := httpclient.New()
	h.Transport = &rt
	return h
}
