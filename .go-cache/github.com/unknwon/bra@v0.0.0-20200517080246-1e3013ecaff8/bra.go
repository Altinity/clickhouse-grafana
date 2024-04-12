// Copyright 2014 Unknwon
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

// Bra(Brilliant Ridiculous Assistant) is a command line utility tool.
package main

import (
	"os"

	"github.com/unknwon/log"
	"github.com/urfave/cli"

	"github.com/unknwon/bra/cmd"
)

const version = "0.4.3.1020"

func init() {
	cmd.AppVer = version
}

func main() {
	app := &cli.App{
		Name:  "Bra",
		Usage: "Brilliant Ridiculous Assistant is a command line utility tool",
		Commands: []cli.Command{
			cmd.Init,
			cmd.Run,
			cmd.Sync,
		},
		Version: version,
	}
	if err := app.Run(os.Args); err != nil {
		log.Fatal("%v", err)
	}
}
