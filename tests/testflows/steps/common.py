import json
import time
import os

from testflows.core import *
from contextlib import contextmanager
from testflows.asserts import error
from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
    StaleElementReferenceException,
)
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.select import Select
from selenium.webdriver.common.by import By as SelectBy
from selenium.webdriver.support import expected_conditions as EC
from selenium import webdriver as selenium_webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from PIL import Image

from steps.dashboards.view import *
from steps.dashboard.view import *


@TestStep(Given)
def new_webdriver(self):
    """Create new webdriver instance."""
    self.context.driver = webdriver(
        browser=self.context.browser,
        local=self.context.local,
        local_webdriver_path=self.context.local_webdriver_path,
        global_wait_time=self.context.global_wait_time,
    )

    yield self.context.driver


@TestStep(Finally)
def append_session(self, suite_name, session_id):

    sessions_file_path = 'assets/sessions.json'

    if os.path.exists(sessions_file_path):
        with open(sessions_file_path, 'r') as file:
            sessions = json.load(file)
    else:
        sessions = {}

    sessions[session_id] = suite_name

    with open(sessions_file_path, 'w') as file:
        json.dump(sessions, file, indent=4)


@TestStep(Given)
def create_local_chrome_driver(self, browser, local_webdriver_path, common_options, is_no_sandbox, is_headless):
    """Create a local Chrome driver instance."""

    with When("I set the local chrome options"):
        chrome_options = selenium_webdriver.ChromeOptions()

        for option in common_options:
            chrome_options.add_argument(option)

        default_download_directory = os.path.join(os.getcwd(), "download")

        chrome_options.set_capability("browserName", browser)
        chrome_options.add_experimental_option(
            "prefs",
            {
                "download.prompt_for_download": False,
                "download.directory_upgrade": True,
                "profile.default_content_settings.popups": 0,
                "download.default_directory": default_download_directory,
            },
        )
        if is_no_sandbox:
            chrome_options.add_argument("--no-sandbox")
        if is_headless:
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("window-size=1560,1160")
            chrome_options.add_argument('--enable-logging')
            chrome_options.add_argument('--v=1')

    with And("create a local webdriver instance"):
        service = Service(executable_path=local_webdriver_path)
        return selenium_webdriver.Chrome(options=chrome_options, service=service)
    

@TestStep(Given)
def create_remote_chrome_driver(self, browser, hub_url, common_options, timeout, suite=None):
    """Create a remote Chrome driver instance."""

    with When("I set the remote chrome options"):
        remote_chrome_options = Options()

        for option in common_options:
            remote_chrome_options.add_argument(option)

        remote_chrome_prefs = {
            "credentials_enable_service": False,
            "profile.password_manager_enabled": False,
        }
        remote_chrome_options.add_experimental_option("prefs", remote_chrome_prefs)
        remote_chrome_options.set_capability("browserName", browser)
        remote_chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        remote_chrome_options.add_experimental_option("useAutomationExtension", False)
        remote_chrome_options.set_capability("se:recordVideo", "true")
        remote_chrome_options.set_capability("se:screenResolution", "1920x1080")

        start_time = time.time()
        # pause()
    with And("try to create a remote webdriver instance"):
        while True:
            try:
                return selenium_webdriver.Remote(command_executor=hub_url, options=remote_chrome_options)
            except Exception:
                if time.time() - start_time >= timeout:
                    raise
                time.sleep(1)


@TestStep(Given)
def webdriver(
        self,
        browser="chrome",
        hub_url="http://localhost:4444",
        timeout=300,
        local=False,
        local_webdriver_path=None,
        is_no_sandbox=False,
        is_headless=False,
        incognito=True,
        global_wait_time=10,
        clean_up=True,
        suite="grafana"
):
    """Create a webdriver instance."""

    with Given("common options"):
        common_options = ["--disable-infobars", "start-maximized", "--disable-dev-shm-usage"]

        if incognito:
            common_options.append("--incognito")

    driver = None

    try:
        with When(f"I create a webdriver instance: local={local}"):
            if local:
                driver = create_local_chrome_driver(
                    browser=browser,
                    local_webdriver_path=local_webdriver_path,
                    common_options=common_options,
                    is_headless=is_headless,
                    is_no_sandbox=is_no_sandbox
                )
            else:
                driver = create_remote_chrome_driver(
                    browser=browser,
                    hub_url=hub_url,
                    common_options=common_options,
                    timeout=timeout,
                    suite=suite
                )

        with And("set implicit wait time"):
            driver.implicit_wait = global_wait_time
            driver.implicitly_wait(global_wait_time)

        yield driver

    finally:
        if not local:
            with Finally("append the session tags to the session.json"):
                append_session(suite_name=suite, session_id=driver.session_id)

        if clean_up and driver:
            with Finally("clean up"):
                driver.close()
                driver.quit()

@TestStep(Given)
def create_driver(self, incognito=True, clean_up=True, suite=None):
    """Create a driver based on the arguments in the context."""

    driver = webdriver(
        browser=self.context.browser,
        local=self.context.local,
        incognito=incognito,
        clean_up=clean_up,
        suite="grafana"
    )

    return driver


@TestStep(Then)
def compare_screenshots(self, screenshot_name_1, screenshot_name_2):

    image_1 = Image.open(f"./tests/testflows/screenshots/{screenshot_name_1}.png")
    image_2 = Image.open(f"./tests/testflows/screenshots/{screenshot_name_2}.png")
    return image_1 == image_2


@TestStep(Given)
def create_dashboard(self, dashboard_name):
    try:
        with delay():
            with When("I open new dashboard view"):
                open_new_dashboard_endpoint()

        with And("I save new dashboard"):
            saving_dashboard(dashboard_name=dashboard_name)

        yield
    finally:
        with Finally(f"I delete dashboard {dashboard_name}"):
            delete_dashboard(dashboard_name=dashboard_name)


@TestStep(Given)
def create_panel(self, panel_name):
    try:
        yield
    finally:
        pass