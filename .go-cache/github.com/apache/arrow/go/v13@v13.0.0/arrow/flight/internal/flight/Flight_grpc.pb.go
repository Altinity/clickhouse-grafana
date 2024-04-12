// Code generated by protoc-gen-go-grpc. DO NOT EDIT.

package flight

import (
	context "context"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
const _ = grpc.SupportPackageIsVersion7

// FlightServiceClient is the client API for FlightService service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
type FlightServiceClient interface {
	// Handshake between client and server. Depending on the server, the
	// handshake may be required to determine the token that should be used for
	// future operations. Both request and response are streams to allow multiple
	// round-trips depending on auth mechanism.
	Handshake(ctx context.Context, opts ...grpc.CallOption) (FlightService_HandshakeClient, error)
	// Get a list of available streams given a particular criteria. Most flight
	// services will expose one or more streams that are readily available for
	// retrieval. This api allows listing the streams available for
	// consumption. A user can also provide a criteria. The criteria can limit
	// the subset of streams that can be listed via this interface. Each flight
	// service allows its own definition of how to consume criteria.
	ListFlights(ctx context.Context, in *Criteria, opts ...grpc.CallOption) (FlightService_ListFlightsClient, error)
	// For a given FlightDescriptor, get information about how the flight can be
	// consumed. This is a useful interface if the consumer of the interface
	// already can identify the specific flight to consume. This interface can
	// also allow a consumer to generate a flight stream through a specified
	// descriptor. For example, a flight descriptor might be something that
	// includes a SQL statement or a Pickled Python operation that will be
	// executed. In those cases, the descriptor will not be previously available
	// within the list of available streams provided by ListFlights but will be
	// available for consumption for the duration defined by the specific flight
	// service.
	GetFlightInfo(ctx context.Context, in *FlightDescriptor, opts ...grpc.CallOption) (*FlightInfo, error)
	// For a given FlightDescriptor, get the Schema as described in Schema.fbs::Schema
	// This is used when a consumer needs the Schema of flight stream. Similar to
	// GetFlightInfo this interface may generate a new flight that was not previously
	// available in ListFlights.
	GetSchema(ctx context.Context, in *FlightDescriptor, opts ...grpc.CallOption) (*SchemaResult, error)
	// Retrieve a single stream associated with a particular descriptor
	// associated with the referenced ticket. A Flight can be composed of one or
	// more streams where each stream can be retrieved using a separate opaque
	// ticket that the flight service uses for managing a collection of streams.
	DoGet(ctx context.Context, in *Ticket, opts ...grpc.CallOption) (FlightService_DoGetClient, error)
	// Push a stream to the flight service associated with a particular
	// flight stream. This allows a client of a flight service to upload a stream
	// of data. Depending on the particular flight service, a client consumer
	// could be allowed to upload a single stream per descriptor or an unlimited
	// number. In the latter, the service might implement a 'seal' action that
	// can be applied to a descriptor once all streams are uploaded.
	DoPut(ctx context.Context, opts ...grpc.CallOption) (FlightService_DoPutClient, error)
	// Open a bidirectional data channel for a given descriptor. This
	// allows clients to send and receive arbitrary Arrow data and
	// application-specific metadata in a single logical stream. In
	// contrast to DoGet/DoPut, this is more suited for clients
	// offloading computation (rather than storage) to a Flight service.
	DoExchange(ctx context.Context, opts ...grpc.CallOption) (FlightService_DoExchangeClient, error)
	// Flight services can support an arbitrary number of simple actions in
	// addition to the possible ListFlights, GetFlightInfo, DoGet, DoPut
	// operations that are potentially available. DoAction allows a flight client
	// to do a specific action against a flight service. An action includes
	// opaque request and response objects that are specific to the type action
	// being undertaken.
	DoAction(ctx context.Context, in *Action, opts ...grpc.CallOption) (FlightService_DoActionClient, error)
	// A flight service exposes all of the available action types that it has
	// along with descriptions. This allows different flight consumers to
	// understand the capabilities of the flight service.
	ListActions(ctx context.Context, in *Empty, opts ...grpc.CallOption) (FlightService_ListActionsClient, error)
}

type flightServiceClient struct {
	cc grpc.ClientConnInterface
}

func NewFlightServiceClient(cc grpc.ClientConnInterface) FlightServiceClient {
	return &flightServiceClient{cc}
}

func (c *flightServiceClient) Handshake(ctx context.Context, opts ...grpc.CallOption) (FlightService_HandshakeClient, error) {
	stream, err := c.cc.NewStream(ctx, &_FlightService_serviceDesc.Streams[0], "/arrow.flight.protocol.FlightService/Handshake", opts...)
	if err != nil {
		return nil, err
	}
	x := &flightServiceHandshakeClient{stream}
	return x, nil
}

type FlightService_HandshakeClient interface {
	Send(*HandshakeRequest) error
	Recv() (*HandshakeResponse, error)
	grpc.ClientStream
}

type flightServiceHandshakeClient struct {
	grpc.ClientStream
}

func (x *flightServiceHandshakeClient) Send(m *HandshakeRequest) error {
	return x.ClientStream.SendMsg(m)
}

func (x *flightServiceHandshakeClient) Recv() (*HandshakeResponse, error) {
	m := new(HandshakeResponse)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *flightServiceClient) ListFlights(ctx context.Context, in *Criteria, opts ...grpc.CallOption) (FlightService_ListFlightsClient, error) {
	stream, err := c.cc.NewStream(ctx, &_FlightService_serviceDesc.Streams[1], "/arrow.flight.protocol.FlightService/ListFlights", opts...)
	if err != nil {
		return nil, err
	}
	x := &flightServiceListFlightsClient{stream}
	if err := x.ClientStream.SendMsg(in); err != nil {
		return nil, err
	}
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	return x, nil
}

type FlightService_ListFlightsClient interface {
	Recv() (*FlightInfo, error)
	grpc.ClientStream
}

type flightServiceListFlightsClient struct {
	grpc.ClientStream
}

func (x *flightServiceListFlightsClient) Recv() (*FlightInfo, error) {
	m := new(FlightInfo)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *flightServiceClient) GetFlightInfo(ctx context.Context, in *FlightDescriptor, opts ...grpc.CallOption) (*FlightInfo, error) {
	out := new(FlightInfo)
	err := c.cc.Invoke(ctx, "/arrow.flight.protocol.FlightService/GetFlightInfo", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *flightServiceClient) GetSchema(ctx context.Context, in *FlightDescriptor, opts ...grpc.CallOption) (*SchemaResult, error) {
	out := new(SchemaResult)
	err := c.cc.Invoke(ctx, "/arrow.flight.protocol.FlightService/GetSchema", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *flightServiceClient) DoGet(ctx context.Context, in *Ticket, opts ...grpc.CallOption) (FlightService_DoGetClient, error) {
	stream, err := c.cc.NewStream(ctx, &_FlightService_serviceDesc.Streams[2], "/arrow.flight.protocol.FlightService/DoGet", opts...)
	if err != nil {
		return nil, err
	}
	x := &flightServiceDoGetClient{stream}
	if err := x.ClientStream.SendMsg(in); err != nil {
		return nil, err
	}
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	return x, nil
}

type FlightService_DoGetClient interface {
	Recv() (*FlightData, error)
	grpc.ClientStream
}

type flightServiceDoGetClient struct {
	grpc.ClientStream
}

func (x *flightServiceDoGetClient) Recv() (*FlightData, error) {
	m := new(FlightData)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *flightServiceClient) DoPut(ctx context.Context, opts ...grpc.CallOption) (FlightService_DoPutClient, error) {
	stream, err := c.cc.NewStream(ctx, &_FlightService_serviceDesc.Streams[3], "/arrow.flight.protocol.FlightService/DoPut", opts...)
	if err != nil {
		return nil, err
	}
	x := &flightServiceDoPutClient{stream}
	return x, nil
}

type FlightService_DoPutClient interface {
	Send(*FlightData) error
	Recv() (*PutResult, error)
	grpc.ClientStream
}

type flightServiceDoPutClient struct {
	grpc.ClientStream
}

func (x *flightServiceDoPutClient) Send(m *FlightData) error {
	return x.ClientStream.SendMsg(m)
}

func (x *flightServiceDoPutClient) Recv() (*PutResult, error) {
	m := new(PutResult)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *flightServiceClient) DoExchange(ctx context.Context, opts ...grpc.CallOption) (FlightService_DoExchangeClient, error) {
	stream, err := c.cc.NewStream(ctx, &_FlightService_serviceDesc.Streams[4], "/arrow.flight.protocol.FlightService/DoExchange", opts...)
	if err != nil {
		return nil, err
	}
	x := &flightServiceDoExchangeClient{stream}
	return x, nil
}

type FlightService_DoExchangeClient interface {
	Send(*FlightData) error
	Recv() (*FlightData, error)
	grpc.ClientStream
}

type flightServiceDoExchangeClient struct {
	grpc.ClientStream
}

func (x *flightServiceDoExchangeClient) Send(m *FlightData) error {
	return x.ClientStream.SendMsg(m)
}

func (x *flightServiceDoExchangeClient) Recv() (*FlightData, error) {
	m := new(FlightData)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *flightServiceClient) DoAction(ctx context.Context, in *Action, opts ...grpc.CallOption) (FlightService_DoActionClient, error) {
	stream, err := c.cc.NewStream(ctx, &_FlightService_serviceDesc.Streams[5], "/arrow.flight.protocol.FlightService/DoAction", opts...)
	if err != nil {
		return nil, err
	}
	x := &flightServiceDoActionClient{stream}
	if err := x.ClientStream.SendMsg(in); err != nil {
		return nil, err
	}
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	return x, nil
}

type FlightService_DoActionClient interface {
	Recv() (*Result, error)
	grpc.ClientStream
}

type flightServiceDoActionClient struct {
	grpc.ClientStream
}

func (x *flightServiceDoActionClient) Recv() (*Result, error) {
	m := new(Result)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *flightServiceClient) ListActions(ctx context.Context, in *Empty, opts ...grpc.CallOption) (FlightService_ListActionsClient, error) {
	stream, err := c.cc.NewStream(ctx, &_FlightService_serviceDesc.Streams[6], "/arrow.flight.protocol.FlightService/ListActions", opts...)
	if err != nil {
		return nil, err
	}
	x := &flightServiceListActionsClient{stream}
	if err := x.ClientStream.SendMsg(in); err != nil {
		return nil, err
	}
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	return x, nil
}

type FlightService_ListActionsClient interface {
	Recv() (*ActionType, error)
	grpc.ClientStream
}

type flightServiceListActionsClient struct {
	grpc.ClientStream
}

func (x *flightServiceListActionsClient) Recv() (*ActionType, error) {
	m := new(ActionType)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

// FlightServiceServer is the server API for FlightService service.
// All implementations must embed UnimplementedFlightServiceServer
// for forward compatibility
type FlightServiceServer interface {
	// Handshake between client and server. Depending on the server, the
	// handshake may be required to determine the token that should be used for
	// future operations. Both request and response are streams to allow multiple
	// round-trips depending on auth mechanism.
	Handshake(FlightService_HandshakeServer) error
	// Get a list of available streams given a particular criteria. Most flight
	// services will expose one or more streams that are readily available for
	// retrieval. This api allows listing the streams available for
	// consumption. A user can also provide a criteria. The criteria can limit
	// the subset of streams that can be listed via this interface. Each flight
	// service allows its own definition of how to consume criteria.
	ListFlights(*Criteria, FlightService_ListFlightsServer) error
	// For a given FlightDescriptor, get information about how the flight can be
	// consumed. This is a useful interface if the consumer of the interface
	// already can identify the specific flight to consume. This interface can
	// also allow a consumer to generate a flight stream through a specified
	// descriptor. For example, a flight descriptor might be something that
	// includes a SQL statement or a Pickled Python operation that will be
	// executed. In those cases, the descriptor will not be previously available
	// within the list of available streams provided by ListFlights but will be
	// available for consumption for the duration defined by the specific flight
	// service.
	GetFlightInfo(context.Context, *FlightDescriptor) (*FlightInfo, error)
	// For a given FlightDescriptor, get the Schema as described in Schema.fbs::Schema
	// This is used when a consumer needs the Schema of flight stream. Similar to
	// GetFlightInfo this interface may generate a new flight that was not previously
	// available in ListFlights.
	GetSchema(context.Context, *FlightDescriptor) (*SchemaResult, error)
	// Retrieve a single stream associated with a particular descriptor
	// associated with the referenced ticket. A Flight can be composed of one or
	// more streams where each stream can be retrieved using a separate opaque
	// ticket that the flight service uses for managing a collection of streams.
	DoGet(*Ticket, FlightService_DoGetServer) error
	// Push a stream to the flight service associated with a particular
	// flight stream. This allows a client of a flight service to upload a stream
	// of data. Depending on the particular flight service, a client consumer
	// could be allowed to upload a single stream per descriptor or an unlimited
	// number. In the latter, the service might implement a 'seal' action that
	// can be applied to a descriptor once all streams are uploaded.
	DoPut(FlightService_DoPutServer) error
	// Open a bidirectional data channel for a given descriptor. This
	// allows clients to send and receive arbitrary Arrow data and
	// application-specific metadata in a single logical stream. In
	// contrast to DoGet/DoPut, this is more suited for clients
	// offloading computation (rather than storage) to a Flight service.
	DoExchange(FlightService_DoExchangeServer) error
	// Flight services can support an arbitrary number of simple actions in
	// addition to the possible ListFlights, GetFlightInfo, DoGet, DoPut
	// operations that are potentially available. DoAction allows a flight client
	// to do a specific action against a flight service. An action includes
	// opaque request and response objects that are specific to the type action
	// being undertaken.
	DoAction(*Action, FlightService_DoActionServer) error
	// A flight service exposes all of the available action types that it has
	// along with descriptions. This allows different flight consumers to
	// understand the capabilities of the flight service.
	ListActions(*Empty, FlightService_ListActionsServer) error
	mustEmbedUnimplementedFlightServiceServer()
}

// UnimplementedFlightServiceServer must be embedded to have forward compatible implementations.
type UnimplementedFlightServiceServer struct {
}

func (UnimplementedFlightServiceServer) Handshake(FlightService_HandshakeServer) error {
	return status.Errorf(codes.Unimplemented, "method Handshake not implemented")
}
func (UnimplementedFlightServiceServer) ListFlights(*Criteria, FlightService_ListFlightsServer) error {
	return status.Errorf(codes.Unimplemented, "method ListFlights not implemented")
}
func (UnimplementedFlightServiceServer) GetFlightInfo(context.Context, *FlightDescriptor) (*FlightInfo, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetFlightInfo not implemented")
}
func (UnimplementedFlightServiceServer) GetSchema(context.Context, *FlightDescriptor) (*SchemaResult, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetSchema not implemented")
}
func (UnimplementedFlightServiceServer) DoGet(*Ticket, FlightService_DoGetServer) error {
	return status.Errorf(codes.Unimplemented, "method DoGet not implemented")
}
func (UnimplementedFlightServiceServer) DoPut(FlightService_DoPutServer) error {
	return status.Errorf(codes.Unimplemented, "method DoPut not implemented")
}
func (UnimplementedFlightServiceServer) DoExchange(FlightService_DoExchangeServer) error {
	return status.Errorf(codes.Unimplemented, "method DoExchange not implemented")
}
func (UnimplementedFlightServiceServer) DoAction(*Action, FlightService_DoActionServer) error {
	return status.Errorf(codes.Unimplemented, "method DoAction not implemented")
}
func (UnimplementedFlightServiceServer) ListActions(*Empty, FlightService_ListActionsServer) error {
	return status.Errorf(codes.Unimplemented, "method ListActions not implemented")
}
func (UnimplementedFlightServiceServer) mustEmbedUnimplementedFlightServiceServer() {}

// UnsafeFlightServiceServer may be embedded to opt out of forward compatibility for this service.
// Use of this interface is not recommended, as added methods to FlightServiceServer will
// result in compilation errors.
type UnsafeFlightServiceServer interface {
	mustEmbedUnimplementedFlightServiceServer()
}

func RegisterFlightServiceServer(s *grpc.Server, srv FlightServiceServer) {
	s.RegisterService(&_FlightService_serviceDesc, srv)
}

func _FlightService_Handshake_Handler(srv interface{}, stream grpc.ServerStream) error {
	return srv.(FlightServiceServer).Handshake(&flightServiceHandshakeServer{stream})
}

type FlightService_HandshakeServer interface {
	Send(*HandshakeResponse) error
	Recv() (*HandshakeRequest, error)
	grpc.ServerStream
}

type flightServiceHandshakeServer struct {
	grpc.ServerStream
}

func (x *flightServiceHandshakeServer) Send(m *HandshakeResponse) error {
	return x.ServerStream.SendMsg(m)
}

func (x *flightServiceHandshakeServer) Recv() (*HandshakeRequest, error) {
	m := new(HandshakeRequest)
	if err := x.ServerStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func _FlightService_ListFlights_Handler(srv interface{}, stream grpc.ServerStream) error {
	m := new(Criteria)
	if err := stream.RecvMsg(m); err != nil {
		return err
	}
	return srv.(FlightServiceServer).ListFlights(m, &flightServiceListFlightsServer{stream})
}

type FlightService_ListFlightsServer interface {
	Send(*FlightInfo) error
	grpc.ServerStream
}

type flightServiceListFlightsServer struct {
	grpc.ServerStream
}

func (x *flightServiceListFlightsServer) Send(m *FlightInfo) error {
	return x.ServerStream.SendMsg(m)
}

func _FlightService_GetFlightInfo_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(FlightDescriptor)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(FlightServiceServer).GetFlightInfo(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/arrow.flight.protocol.FlightService/GetFlightInfo",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(FlightServiceServer).GetFlightInfo(ctx, req.(*FlightDescriptor))
	}
	return interceptor(ctx, in, info, handler)
}

func _FlightService_GetSchema_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(FlightDescriptor)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(FlightServiceServer).GetSchema(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/arrow.flight.protocol.FlightService/GetSchema",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(FlightServiceServer).GetSchema(ctx, req.(*FlightDescriptor))
	}
	return interceptor(ctx, in, info, handler)
}

func _FlightService_DoGet_Handler(srv interface{}, stream grpc.ServerStream) error {
	m := new(Ticket)
	if err := stream.RecvMsg(m); err != nil {
		return err
	}
	return srv.(FlightServiceServer).DoGet(m, &flightServiceDoGetServer{stream})
}

type FlightService_DoGetServer interface {
	Send(*FlightData) error
	grpc.ServerStream
}

type flightServiceDoGetServer struct {
	grpc.ServerStream
}

func (x *flightServiceDoGetServer) Send(m *FlightData) error {
	return x.ServerStream.SendMsg(m)
}

func _FlightService_DoPut_Handler(srv interface{}, stream grpc.ServerStream) error {
	return srv.(FlightServiceServer).DoPut(&flightServiceDoPutServer{stream})
}

type FlightService_DoPutServer interface {
	Send(*PutResult) error
	Recv() (*FlightData, error)
	grpc.ServerStream
}

type flightServiceDoPutServer struct {
	grpc.ServerStream
}

func (x *flightServiceDoPutServer) Send(m *PutResult) error {
	return x.ServerStream.SendMsg(m)
}

func (x *flightServiceDoPutServer) Recv() (*FlightData, error) {
	m := new(FlightData)
	if err := x.ServerStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func _FlightService_DoExchange_Handler(srv interface{}, stream grpc.ServerStream) error {
	return srv.(FlightServiceServer).DoExchange(&flightServiceDoExchangeServer{stream})
}

type FlightService_DoExchangeServer interface {
	Send(*FlightData) error
	Recv() (*FlightData, error)
	grpc.ServerStream
}

type flightServiceDoExchangeServer struct {
	grpc.ServerStream
}

func (x *flightServiceDoExchangeServer) Send(m *FlightData) error {
	return x.ServerStream.SendMsg(m)
}

func (x *flightServiceDoExchangeServer) Recv() (*FlightData, error) {
	m := new(FlightData)
	if err := x.ServerStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func _FlightService_DoAction_Handler(srv interface{}, stream grpc.ServerStream) error {
	m := new(Action)
	if err := stream.RecvMsg(m); err != nil {
		return err
	}
	return srv.(FlightServiceServer).DoAction(m, &flightServiceDoActionServer{stream})
}

type FlightService_DoActionServer interface {
	Send(*Result) error
	grpc.ServerStream
}

type flightServiceDoActionServer struct {
	grpc.ServerStream
}

func (x *flightServiceDoActionServer) Send(m *Result) error {
	return x.ServerStream.SendMsg(m)
}

func _FlightService_ListActions_Handler(srv interface{}, stream grpc.ServerStream) error {
	m := new(Empty)
	if err := stream.RecvMsg(m); err != nil {
		return err
	}
	return srv.(FlightServiceServer).ListActions(m, &flightServiceListActionsServer{stream})
}

type FlightService_ListActionsServer interface {
	Send(*ActionType) error
	grpc.ServerStream
}

type flightServiceListActionsServer struct {
	grpc.ServerStream
}

func (x *flightServiceListActionsServer) Send(m *ActionType) error {
	return x.ServerStream.SendMsg(m)
}

var _FlightService_serviceDesc = grpc.ServiceDesc{
	ServiceName: "arrow.flight.protocol.FlightService",
	HandlerType: (*FlightServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetFlightInfo",
			Handler:    _FlightService_GetFlightInfo_Handler,
		},
		{
			MethodName: "GetSchema",
			Handler:    _FlightService_GetSchema_Handler,
		},
	},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "Handshake",
			Handler:       _FlightService_Handshake_Handler,
			ServerStreams: true,
			ClientStreams: true,
		},
		{
			StreamName:    "ListFlights",
			Handler:       _FlightService_ListFlights_Handler,
			ServerStreams: true,
		},
		{
			StreamName:    "DoGet",
			Handler:       _FlightService_DoGet_Handler,
			ServerStreams: true,
		},
		{
			StreamName:    "DoPut",
			Handler:       _FlightService_DoPut_Handler,
			ServerStreams: true,
			ClientStreams: true,
		},
		{
			StreamName:    "DoExchange",
			Handler:       _FlightService_DoExchange_Handler,
			ServerStreams: true,
			ClientStreams: true,
		},
		{
			StreamName:    "DoAction",
			Handler:       _FlightService_DoAction_Handler,
			ServerStreams: true,
		},
		{
			StreamName:    "ListActions",
			Handler:       _FlightService_ListActions_Handler,
			ServerStreams: true,
		},
	},
	Metadata: "Flight.proto",
}