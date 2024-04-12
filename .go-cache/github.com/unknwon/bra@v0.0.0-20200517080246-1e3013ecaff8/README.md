Brilliant Ridiculous Assistant
==============================

Bra (Brilliant Ridiculous Assistant) is a command line utility tool.

### Installtion

```bash
$ env GO111MODULE=on go get github.com/unknwon/bra
```

## Usage

```
USAGE:
   bra [global options] command [command options] [arguments...]

COMMANDS:
   init     initialize config template file
   run      start monitoring and notifying
   sync     keep syncing two end points
   help, h  Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h     show help
   --version, -v  print the version
```

## Quick Start

To work with a new app, you have to have a `.bra.toml` file under the work directory. You can quickly generate a default one by executing following command:

```
$ bra init
```

## FAQs

### How to I gracefully shutdown the application?

Change following values in your `.bra.toml`:

```toml
[run]
interrupt_timout = 15
graceful_kill = true
```

This will send `os.Interrupt` signal first and wait for `15` seconds before force kill.

## Configuration

An example configuration is available as [default.bra.toml](templates/default.bra.toml).

## License

This project is under Apache v2 License. See the [LICENSE](LICENSE) file for the full license text.
