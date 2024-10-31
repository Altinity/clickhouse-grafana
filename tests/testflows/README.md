# Running Altinity grafana plugin testflows tests locally

## Steps to follow

1. Install docker compose.
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) test" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 
```
2. Install required python packages:
  `pip install -r tests/testflows/requirements.txt`
3. Stop applications that use the following ports:
   - 8123, 9000, 5432, 3306, 3000, 3001, 8480, 4444
3. Go into tests/testflows directory
4. Run regression.py
  `./regression.py`
  
## Useful options
  The following options can be useful:
    `--before=0.5 --after=0.5` - delay before and after steps.

## Watching running tests
  You can check running tests on `localhost:4444` password=secret

# Collecting code coverage

This tests collect code coverage for Golang and TypeScript parts.

## Collecting code coverage for Golang part

To collect code coverage for Golang code, follow these steps:

1. Build an instrumented program.
  `docker compose run --rm backend_coverage_builder`
  This command runs the `go build` command with the `-cover` option.
2. Run the program with the `GOCOVERDIR` environment variable.
  This variable will define the path to the coverage in `.json` format.
  In tests, grafana containers use `GOCOVERDIR: "/usr/share/grafana/coverage"`.
3. Generate coverage from `.json` files.
  `docker compose run --rm backend_coverage_generate`
  This command does the following:
  3.1 Transform coverage in `.txt` format.
    `go tool covdata textfmt -i=coverage/raw -o=coverage/coverage.txt`.
  3.2. Transform coverage in `.html` format.
    `go tool cover -html=coverage/coverage.txt -o=coverage/coverage.html`.

## Collecting code coverage for TypeScript part

To collect code coverage for TypeScript code, follow these steps:

1. Install istanbul, nyc, and other JavaScript libraries you need for the project.
  You can see it in dependencies in the package.json file.
2. Build an instrumented program.
  `docker compose run --rm frontend_coverage_builder`
  This command does the following:
  2.1. Create instrumented code for the source files.
    `npx nyc instrument --source-map --nycrc-path .nycrc ./src ./instrumented`
  2.2. Move other source files to the instrumented files.
    `cp -R -n src/* instrumented/`
  2.3. Build instrumented program version.
    `webpack -c ./webpack.config.ts --env test`
3. Run the program and collect coverage from the browser console before every page refreshing.
  `return JSON.stringify(window.__coverage__);` command for browser console.
  Need to collect this into separate files. 
4. Generate coverage report.
  `docker compose run --rm frontend_coverage_generate`
  This command does the following:
  4.1. Copy `.json` files to the .nyc_output directory.
    `cp -R -n src/* instrumented/`
  4.2. Transform coverage in `.html` format.
    `npx nyc report --reporter=html --report-dir=./tests/testflows/coverage`