<img align=right style="width: 5em;" src="https://github.com/user-attachments/assets/1e97270f-7925-4cc2-8791-8d0cc77fe512">

<br>

# 🧪 Running Altinity grafana plugin testflows tests locally

## 👣 Steps to follow
* Install docker compose.
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) test" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 
```
* Install required python packages:
  
  `pip install -r tests/testflows/requirements.txt`

* Stop applications that use the following ports:
   - 8123, 9000, 5432, 3306, 3000, 3001, 8480, 4444
* Go into tests/testflows directory
* Run regression.py
   
  `./regression.py`
  
## ⚙️ Useful options
  The following options can be useful:

    `--before=0.5 --after=0.5` - delay before and after steps.

## 👀 Watching running tests
  You can check running tests on `localhost:4444` password=secret

# 🧾 Collecting code coverage

This tests collect code coverage for Golang and TypeScript parts.

## 🔍 Collecting code coverage for Golang part

To collect code coverage for Golang code, follow these steps:

* Build an instrumented program.

  `docker compose run --rm backend_coverage_builder`
  
  This command runs the `go build` command with the `-cover` option.

* Run the program with the `GOCOVERDIR` environment variable.
  
  This variable will define the path to the coverage in `.json` format.
  
  In tests, grafana containers use `GOCOVERDIR: "/usr/share/grafana/coverage"`.

* Generate coverage from `.json` files.
  
  `docker compose run --rm backend_coverage_generate`
  
  This command does the following:
  
  + Transform coverage in `.txt` format.
  
      `go tool covdata textfmt -i=coverage/raw -o=coverage/coverage.txt`.
  
  + Transform coverage in `.html` format.
  
      `go tool cover -html=coverage/coverage.txt -o=coverage/coverage.html`.

## 🔍 Collecting code coverage for TypeScript part

To collect code coverage for TypeScript code, follow these steps:

* Install istanbul, nyc, and other JavaScript libraries you need for the project.

  You can see it in dependencies in the package.json file.
* Build an instrumented program.

  `docker compose run --rm frontend_coverage_builder`
  
  This command does the following:
  
  + Create instrumented code for the source files.
  
    `npx nyc instrument --source-map --nycrc-path .nycrc ./src ./instrumented`
  
  + Move other source files to the instrumented files.
  
    `cp -R -n src/* instrumented/`
  
  + Build instrumented program version.
  
    `webpack -c ./webpack.config.ts --env test`

* Run the program and collect coverage from the browser console before every page refreshing.

  `return JSON.stringify(window.__coverage__);` command for browser console.
  
  Need to collect this into separate files. 

* Generate coverage report.
  
  `docker compose run --rm frontend_coverage_generate`
  
  This command does the following:
  
  + Copy `.json` files to the .nyc_output directory.
  
    `cp -R -n src/* instrumented/`
  
  + Transform coverage in `.html` format.
  
    `npx nyc report --reporter=html --report-dir=./tests/testflows/coverage`
