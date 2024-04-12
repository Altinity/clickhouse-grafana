// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"testing"
)

func TestStripComments(t *testing.T) {
	tests := []struct {
		name string
		in   string
		exp  string
	}{
		{name: "none", in: `[1,2,3]`, exp: `[1,2,3]`},
		{name: "single-line, line comment at end", in: `[1,2,3] // foo bar`, exp: `[1,2,3] `},
		{name: "single-line, block comment at end", in: `[1,2,3] /* foo bar */  `, exp: `[1,2,3]   `},
		{name: "single-line, block comment at end", in: `[1,2,3] /* /* // */`, exp: `[1,2,3] `},
		{name: "single-line, block comment in middle", in: `[1,/* foo bar */2,3]`, exp: `[1,2,3]`},
		{name: "single-line, block comment in string", in: `[1,"/* foo bar */"]`, exp: `[1,"/* foo bar */"]`},
		{name: "single-line, malformed block comment", in: `[1,2,/*]`, exp: `[1,2,/*]`},
		{name: "single-line, malformed JSON", in: `[1,2,/]`, exp: `[1,2,/]`},

		{
			name: "multi-line",
			in: `[
  1,
  2,
  3
]`,
			exp: `[
  1,
  2,
  3
]`,
		},
		{
			name: "multi-line, multiple line comments",
			in: `[ // foo
  1, // bar
  2,
  3
] // fit`,
			exp: `[ 
  1, 
  2,
  3
] `,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := string(StripComments([]byte(test.in)))
			if got != test.exp {
				t.Errorf("got:\n%s\nexp:\n%s", got, test.exp)
			}
		})
	}
}
