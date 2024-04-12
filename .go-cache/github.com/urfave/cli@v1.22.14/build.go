//go:build ignore
// +build ignore

package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/urfave/cli"
)

var packages = []string{"cli", "altsrc"}

func main() {
	app := cli.NewApp()

	app.Name = "builder"
	app.Usage = "Generates a new urfave/cli build!"

	app.Commands = cli.Commands{
		cli.Command{
			Name:   "vet",
			Action: VetActionFunc,
		},
		cli.Command{
			Name:   "test",
			Action: TestActionFunc,
		},
		cli.Command{
			Name:   "gfmrun",
			Action: GfmrunActionFunc,
		},
		cli.Command{
			Name:   "toc",
			Action: TocActionFunc,
		},
	}
	app.Flags = []cli.Flag{
		&cli.StringFlag{
			Name:  "tags",
			Usage: "set build tags",
		},
	}

	err := app.Run(os.Args)
	if err != nil {
		log.Fatal(err)
	}
}

func runCmd(arg string, args ...string) error {
	cmd := exec.Command(arg, args...)

	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

func VetActionFunc(_ *cli.Context) error {
	return runCmd("go", "vet")
}

func TestActionFunc(c *cli.Context) error {
	tags := c.String("tags")

	for _, pkg := range packages {
		var packageName string

		if pkg == "cli" {
			packageName = "github.com/urfave/cli"
		} else {
			packageName = fmt.Sprintf("github.com/urfave/cli/%s", pkg)
		}

		coverProfile := fmt.Sprintf("--coverprofile=%s.coverprofile", pkg)

		err := runCmd("go", "test", "-tags", tags, "-v", coverProfile, packageName)
		if err != nil {
			return err
		}
	}

	return testCleanup()
}

func testCleanup() error {
	var out bytes.Buffer

	for _, pkg := range packages {
		file, err := os.Open(fmt.Sprintf("%s.coverprofile", pkg))
		if err != nil {
			return err
		}

		b, err := ioutil.ReadAll(file)
		if err != nil {
			return err
		}

		out.Write(b)
		err = file.Close()
		if err != nil {
			return err
		}

		err = os.Remove(fmt.Sprintf("%s.coverprofile", pkg))
		if err != nil {
			return err
		}
	}

	outFile, err := os.Create("coverage.txt")
	if err != nil {
		return err
	}

	_, err = out.WriteTo(outFile)
	if err != nil {
		return err
	}

	err = outFile.Close()
	if err != nil {
		return err
	}

	return nil
}

func GfmrunActionFunc(c *cli.Context) error {
	filename := c.Args().Get(0)
	if filename == "" {
		filename = "README.md"
	}

	file, err := os.Open(filename)
	if err != nil {
		return err
	}

	var counter int
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if strings.Contains(scanner.Text(), "package main") {
			counter++
		}
	}

	err = scanner.Err()
	if err != nil {
		return err
	}

	return runCmd("gfmrun", "-c", fmt.Sprint(counter), "-s", filename)
}

func TocActionFunc(c *cli.Context) error {
	if runtime.GOOS == "windows" {
		log.Println("the toc command is not meant for windows")
		return nil
	}

	filename := c.Args().Get(0)
	if filename == "" {
		filename = "README.md"
	}

	err := runCmd("node_modules/.bin/markdown-toc", "-i", filename)
	if err != nil {
		return err
	}

	err = runCmd("git", "diff", "--exit-code")
	if err != nil {
		return err
	}

	return nil
}
