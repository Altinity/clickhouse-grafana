# Altinity Grafana datasource plugin for ClickHouse

This document is a starting point for building a Altinity Grafana datasource plugin for ClickHouse.

## Build from scratch with docker-compose
This is a simple environment which mounts the current `dist` directory inside the `grafana` container. The `grafana` container connects to the docker `clickhouse` database container.
Also `grafana` container contains some datasource and dashboards installed via `/etc/grafana/provisioning/` folder.

To run the development environment install Docker and docker-compose:
```sh
docker-compose up --no-deps -d grafana clickhouse
```
after that open http://localhost:3000/ to open grafana instance with one clickhouse datasource

#### Frontend Builder

The frontend builder is the docker container used to transpile the typescript source code into the javascript found in the `dist` dir. This will affect the grafana query and configuration functionality.

To develop using docker, the process looks like:
1. change source files
2. `docker-compose run --rm frontend_builder`
3. `docker-compose restart grafana`
4. open http://localhost:3000/

To develop without build inside a docker, the development process for frontend part of code looks like:
1. change source files
2. `npm run test`
3. `npm run build`
4. `docker-compose restart grafana`
5. open http://localhost:3000/

#### Backend Builder

The backend builder is the docker container used to compile the golang source code into the `altinity-clickhouse-plugin_*` binaries in the `dist` dir. This will affect the grafana service used for running queries for alerting. The entrypoint for the go code is at `pkg/main.go`.

To develop using docker, the development process for backend part of code looks like:
1. change source files
2. `docker-compose run --rm backend_builder`
3. `docker-compose restart grafana`
4. open http://localhost:3000/

To format your go code, use the command:
```sh
docker-compose run --rm backend_builder go fmt .
```

## Build from source on Host Machine  Docker

### Backend

1. Update [Grafana plugin SDK for Go](https://grafana.com/docs/grafana/latest/developers/plugins/backend/grafana-plugin-sdk-for-go/) dependency to the latest minor version:

   ```bash
   go get -u github.com/grafana/grafana-plugin-sdk-go
   go mod tidy
   ```

2. Build backend plugin binaries for Linux, Windows and Darwin:

   ```bash
   mage -v
   ```

3. List all available Mage targets for additional commands:

   ```bash
   mage -l
   ```
### Frontend

1. Install dependencies

   ```bash
   npm install
   ```

2. Build plugin in development mode and run in watch mode

   ```bash
   npm run dev
   ```

3. Build plugin in production mode

   ```bash
   npm run build
   ```

4. Run the tests (using Jest)

   ```bash
   # Runs the tests and watches for changes, requires git init first
   npm run test

   # Exits after running all the tests
   npm run test:ci
   ```

5. Spin up a Grafana instance and run the plugin inside it (using Docker)

   ```bash
   npm run server
   ```

6. Run the E2E tests (using Cypress)

   ```bash
   # Spins up a Grafana instance first that we tests against
   npm run server

   # Starts the tests
   npm run e2e
   ```

7. Run the linter

   ```bash
   npm run lint

   # or

   npm run lint:fix
   ```


# Distributing your plugin

When distributing a Grafana plugin either within the community or privately the plugin must be signed so the Grafana application can verify its authenticity. This can be done with the `@grafana/sign-plugin` package.

_Note: It's not necessary to sign a plugin during development. The docker development environment that is scaffolded with `@grafana/create-plugin` caters for running the plugin without a signature._

## Initial steps

Before signing a plugin please read the Grafana [plugin publishing and signing criteria](https://grafana.com/docs/grafana/latest/developers/plugins/publishing-and-signing-criteria/) documentation carefully.

`@grafana/create-plugin` has added the necessary commands and workflows to make signing and distributing a plugin via the grafana plugins catalog as straightforward as possible.

Before signing a plugin for the first time please consult the Grafana [plugin signature levels](https://grafana.com/docs/grafana/latest/developers/plugins/sign-a-plugin/#plugin-signature-levels) documentation to understand the differences between the types of signature level.

1. Create a [Grafana Cloud account](https://grafana.com/signup).
2. Make sure your account present in Vertamedia organization.
   - _You can find the plugin ID in the `plugin.json` file inside your plugin directory. For example, if your account slug is `vertamedia`, you need to prefix the plugin ID with `vertamedia-`._
3. Create a Grafana Cloud API key with the `PluginPublisher` role or create Grafana Access Policy Token with plugin scopes, look for details https://grafana.com/docs/grafana/latest/developers/plugins/sign-a-plugin/#generate-a-token
4. Keep a record of this API keys as it will be required for signing a plugin

## Signing a plugin

### Using Github actions release workflow inside your github fork

If the plugin is using the github actions supplied with `@grafana/create-plugin` signing a plugin is included out of the box. The [release workflow](./.github/workflows/release.yml) can prepare everything to make submitting your plugin to Grafana as easy as possible. Before being able to sign the plugin however a secret needs adding to the Github repository.

1. Please navigate to "settings > secrets > actions" within your repo to create secrets.
2. Click "New repository secret"
3. Name the secret "GRAFANA_ACCESS_POLICY_TOKEN" and value could be generated in https://grafana.com/docs/grafana/latest/developers/plugins/sign-a-plugin/#generate-a-token
4. Paste your Grafana Cloud API key or Grafana Access Policy Token in the Secret Value field
5. Click "Add secret"

#### Push a version tag

To trigger the workflow we need to push a version tag to github with vX.X.X format. This can be achieved with the following steps:

1. Run `npm version <major|minor|patch>`
2. Run `git push origin main --follow-tags`


## Learn more

Below you can find source code for existing app plugins and other related documentation.

- [Basic data source plugin example](https://github.com/grafana/grafana-plugin-examples/tree/master/examples/datasource-basic#readme)
- [`plugin.json` documentation](https://grafana.com/developers/plugin-tools/reference-plugin-json)
- [How to sign a plugin?](https://grafana.com/docs/grafana/latest/developers/plugins/sign-a-plugin/)
