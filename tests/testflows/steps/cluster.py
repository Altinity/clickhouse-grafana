import os
import time
import inspect
import threading
import tempfile

from testflows.core import *
from testflows.asserts import error
from testflows.connect import Shell


class QueryRuntimeException(Exception):
    """Exception during query execution on the server."""

    pass


class Node(object):
    """Generic cluster node."""

    def __init__(self, cluster, name):
        self.cluster = cluster
        self.name = name

    def repr(self):
        return f"Node(name='{self.name}')"

    def restart(self, timeout=120, safe=True):
        """Restart node."""
        with self.cluster.lock:
            for key in list(self.cluster._bash.keys()):
                if key.endswith(f"-{self.name}"):
                    shell = self.cluster._bash.pop(key)
                    shell.__exit__(None, None, None)

        self.cluster.command(
            None, f"{self.cluster.docker_compose} restart {self.name}", timeout=timeout
        )

    def command(self, *args, **kwargs):
        return self.cluster.command(self.name, *args, **kwargs)


class Cluster(object):
    """Simple object around docker compose cluster."""

    def __init__(
        self,
        local=False,
        clickhouse_binary_path=None,
        configs_dir=None,
        nodes=None,
        docker_compose="docker compose --progress plain --profile test",
        docker_compose_project_dir=os.path.join(current_dir(), "..", "..", ".."),
        docker_compose_file="docker-compose.yaml",
        frame=None,
    ):
        self._bash = {}
        self.clickhouse_binary_path = clickhouse_binary_path
        self.configs_dir = configs_dir
        self.local = local
        self.nodes = nodes or {}
        self.docker_compose = docker_compose

        if frame is None:
            frame = inspect.currentframe().f_back
        caller_dir = os.path.dirname(os.path.abspath(frame.f_globals["__file__"]))

        # auto set configs directory
        if self.configs_dir is None:
            caller_configs_dir = caller_dir
            if os.path.exists(caller_configs_dir):
                self.configs_dir = caller_configs_dir

        if not os.path.exists(self.configs_dir):
            raise TypeError("configs directory '{self.configs_dir}' does not exist")

        # auto set docker compose project directory
        if docker_compose_project_dir is None:
            caller_project_dir = os.path.join(caller_dir, "docker-compose")
            if os.path.exists(caller_project_dir):
                docker_compose_project_dir = caller_project_dir

        docker_compose_file_path = os.path.join(
            docker_compose_project_dir or "", docker_compose_file
        )
        note(f'{docker_compose_file_path}')
        if not os.path.exists(docker_compose_file_path):
            raise TypeError(
                f"docker compose file '{docker_compose_file_path}' does not exist"
            )

        self.docker_compose += f' --ansi never --project-directory "{docker_compose_project_dir}" --file "{docker_compose_file_path}"'
        self.lock = threading.Lock()

    def shell(self, node, timeout=120):
        """Returns unique shell terminal to be used."""
        if node is None:
            return Shell()

        shell = Shell(
            command=[
                "/bin/bash",
                "--noediting",
                "-c",
                f"{self.docker_compose} exec {node} bash --noediting",
            ],
            name=node,
        )

        shell.timeout = timeout
        return shell

    def bash(self, node, timeout=120):
        """Returns thread-local bash terminal
        to a specific node.

        :param node: name of the service
        """
        current_thread = threading.current_thread()
        id = f"{current_thread.ident}-{node}"
        with self.lock:
            if self._bash.get(id) is None:
                if node is None:
                    self._bash[id] = Shell().__enter__()
                else:
                    self._bash[id] = Shell(
                        command=[
                            "/bin/bash",
                            "--noediting",
                            "-c",
                            f"{self.docker_compose} exec {node} bash --noediting",
                        ],
                        name=node,
                    ).__enter__()
                self._bash[id].timeout = timeout
            return self._bash[id]

    def __enter__(self):
        with Given("docker compose cluster"):
            self.up()
        return self

    def __exit__(self, type, value, traceback):
        try:
            with Finally("I clean up, docker compose cluster"):
                self.down()
        finally:
            with self.lock:
                for shell in self._bash.values():
                    shell.__exit__(type, value, traceback)

    def node(self, name):
        """Get object with node bound methods.

        :param name: name of service name
        """
        return Node(self, name)

    def down(self, timeout=120):
        """Bring cluster down by executing docker compose down."""
        try:
            bash = self.bash(None)
            with self.lock:
                # remove and close all not None node terminals
                for id in list(self._bash.keys()):
                    shell = self._bash.pop(id)
                    if shell is not bash:
                        shell.__exit__(None, None, None)
                    else:
                        self._bash[id] = shell
        finally:
            self.command(None, f"{self.docker_compose} down -v --remove-orphans", timeout=timeout)
            return self.command(None, f"docker volume prune -f", timeout=timeout)

    def up(self, timeout=30 * 60):
        with Given("I set all the necessary environment variables"):
            os.environ["TEST_COMPOSE_HTTP_TIMEOUT"] = "300"
            os.environ["TEST_CONFIGS_DIR"] = self.configs_dir

        with And("I list environment variables to show their values"):
            self.command(None, "env | grep TEST")

        with And("I bring up docker compose"):
            max_attempts = 5
            for attempt in range(max_attempts):
                with When(f"attempt {attempt}/{max_attempts}"):
                    with By("pulling images for all the services"):
                        cmd = self.command(
                            None,
                            f"set -o pipefail && {self.docker_compose} pull 2>&1 | tee",
                            exitcode=None,
                            timeout=timeout,
                        )
                        if cmd.exitcode != 0:
                            continue
                    with And("executing docker compose down just in case it is up"):
                        cmd = self.command(
                            None,
                            f"set -o pipefail && {self.docker_compose} down 2>&1 | tee",
                            exitcode=None,
                            timeout=timeout,
                        )
                        if cmd.exitcode != 0:
                            continue
                    with And("executing docker compose up"):
                        with By("executing mkdir node_modules"):
                            cmd = self.command(
                                None,
                                f"""set -o pipefail && mkdir -p "{os.path.join(current_dir(), '..', '..', '..')}/node_modules" 2>&1 | tee""",
                                timeout=timeout,
                            )

                        with By("executing docker compose run frontend builder"):
                            cmd = self.command(
                                None,
                                f"set -o pipefail && docker compose run --rm frontend_coverage_builder 2>&1 | tee",
                                timeout=timeout,
                            )
                        with By("executing docker compose run backend builder"):
                            cmd = self.command(
                                None,
                                f"set -o pipefail && docker compose run --rm backend_coverage_builder 2>&1 | tee",
                                timeout=timeout,
                            )
                        with By("executing docker compose up"):
                            env_file = os.path.join(current_dir(), "..", "infra", "env_file")
                            cmd = self.command(
                                None,
                                f"set -o pipefail && {self.docker_compose} --env-file=\"{env_file}\" up -d selenium-standalone 2>&1 | tee",
                                timeout=timeout,
                            )
                    with Then("check there are no unhealthy containers"):
                        if "is unhealthy" in cmd.output:
                            self.command(None, f"set -o pipefail && {self.docker_compose} ps | tee")
                            self.command(None, f"set -o pipefail && {self.docker_compose} logs | tee")

                    if cmd.exitcode == 0:
                        break

            if cmd.exitcode != 0:
                fail("could not bring docker compose up")

    def command(
        self, node, command, message=None, exitcode=0, steps=False, *args, **kwargs
    ):
        """Execute and check command.

        :param node: name of the service
        :param command: command
        :param message: expected message that should be in the output, default: None
        :param exitcode: expected exitcode, default: None
        :param steps: don't break command into steps, default: True
        """
        debug(f"command() {node}, {command}")

        with By("executing command", description=command) if steps else NullStep():
            r = self.bash(node)(command, *args, **kwargs)

        if exitcode is not None:
            with Then(f"exitcode should be {exitcode}") if steps else NullStep():
                assert r.exitcode == exitcode, error(r.output)

        if message is not None:
            with Then(
                f"output should contain message", description=message
            ) if steps else NullStep():
                assert message in r.output, error(r.output)

        return r


@TestStep(Given)
def cluster(self, frame):
    """Create docker compose cluster."""
    with Cluster(frame=frame) as cluster:
        yield cluster
