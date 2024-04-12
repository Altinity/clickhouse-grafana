# Changelog

## v2.0.0

**Summary**: Modernization of this package to Go standards in 2022, mostly
through internal cleanups.

**New Features**: None

The last time this package was significantly modified was 2016, which predates
`cmp`, subtests, the modern Protocol Buffer implementation, and numerous Go
practices that emerged in the intervening years.  The new release is tested
against Go 1.19, though I expect it would work with Go 1.13 just fine.

Finally, I declared bankruptcy on the vendored test fixtures and opted for
creating my own.  This is due to the underlying implementation of the generated
code in conjunction with working with a moving target that is an external data
model representation.

**Upgrade Notes**: This is the aborted v1.0.3 release repackaged as a new
major version 2.  To use this, you will need to do or check the following:

1. The Protocol Buffer messages you provide to this API are from the
   `google.golang.org/protobuf` module.  Take special care to audit any
   generated or checked-in Protocol Buffer message file assets.  They may need
   to be regenerated.

2. Your code should presumably use the `google.golang.org/protobuf` module for
   Protocol Buffers.

3. This is a new major version of the module, so you will need to transition
   from module `github.com/matttproud/golang_protobuf_extensions` to
   `github.com/matttproud/golang_protobuf_extensions/v2`.

## v1.0.4

**Summary**: This is an emergency re-tag of v1.0.2 since v1.0.3 broke API
compatibility for legacy users.  See the description of v1.0.2 for details.

## v1.0.3

**DO NOT USE**: Use v1.0.4 instead.  What is described in v1.0.3 will be
transitioned to a new major version.

**Summary**: Modernization of this package to Go standards in 2022, mostly
through internal cleanups.

**New Features**: None

The last time this package was significantly modified was 2016, which predates
`cmp`, subtests, the modern Protocol Buffer implementation, and numerous Go
practices that emerged in the intervening years.  The new release is tested
against Go 1.19, though I expect it would work with Go 1.13 just fine.

Finally, I declared bankruptcy on the vendored test fixtures and opted for
creating my own.  This is due to the underlying implementation of the generated
code in conjunction with working with a moving target that is an external data
model representation.

## v1.0.2

**Summary**: Tagged version with Go module support.

**New Features**: None

End-users wanted a tagged release that includes Go module support.
