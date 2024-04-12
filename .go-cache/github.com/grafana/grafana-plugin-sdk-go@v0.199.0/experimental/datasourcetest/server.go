package datasourcetest

import "google.golang.org/grpc"

type TestPluginServer struct {
	srv *grpc.Server
}

func newTestPluginServer(s *grpc.Server) *TestPluginServer {
	return &TestPluginServer{
		srv: s,
	}
}
func (s *TestPluginServer) shutdown() {
	s.srv.Stop()
}
