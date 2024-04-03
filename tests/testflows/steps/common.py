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
from PIL import Image

from steps.dashboards.view import *
from steps.dashboard.view import *


@TestStep(Given)
def webdriver(
    self,
    browser="chrome",
    selenium_hub_url="http://127.0.0.1:4444/wd/hub",
    timeout=300,
    local=None,
    local_webdriver_path=None,
    is_no_sandbox=False,
    is_headless=False,
    incognito=True,
    cleanup=True,
):
    """Create webdriver instance."""
    driver = None
    start_time = time.time()
    try_number = 0

    try:
        with Given("I create new webdriver instance"):
            if incognito:
                common_chrome_options = [
                    "--incognito",  # Open Chrome in incognito mode
                    "--disable-infobars",
                ]
            else:
                common_chrome_options = [
                    "--disable-infobars",
                ]
            if local:
                if browser == "chrome":
                    chrome_options = selenium_webdriver.ChromeOptions()
                    for option in common_chrome_options:
                        chrome_options.add_argument(option)
                    default_download_directory = os.path.join(
                        os.path.dirname(current_dir()), "download"
                    )
                    chrome_options.add_argument("start-maximized")
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
                        chrome_options.add_argument("--headless=new")
                        chrome_options.add_argument("window-size=1350, 1000")
                    driver = selenium_webdriver.Chrome(
                        options=chrome_options, executable_path=local_webdriver_path
                    )
                else:
                    fail("only support chrome")
            else:
                while True:
                    try:
                        remote_chrome_options = selenium_webdriver.ChromeOptions()
                        for option in common_chrome_options:
                            remote_chrome_options.add_argument(option)
                        remote_chrome_prefs = {
                            "credentials_enable_service": False,
                            "profile.password_manager_enabled": False,
                        }
                        remote_chrome_options.add_experimental_option(
                            "prefs", remote_chrome_prefs
                        )
                        remote_chrome_options.set_capability("browserName", "chrome")
                        remote_chrome_options.set_capability("javascriptEnabled", True)
                        remote_chrome_options.add_experimental_option(
                            "excludeSwitches", ["enable-automation"]
                        )
                        remote_chrome_options.add_experimental_option(
                            "useAutomationExtension", False
                        )
                        driver = selenium_webdriver.Remote(
                            command_executor=selenium_hub_url,
                            options=remote_chrome_options,
                            desired_capabilities=remote_chrome_options.to_capabilities(),
                        )

                        break
                    except Exception:
                        now = time.time()
                        if now - start_time >= timeout:
                            raise
                        time.sleep(1)
                    try_number += 1

        # try:
        #     with Given("I create new webdriver instance"):
        #         if local:
        #             if browser == "chrome":
        #                 default_download_directory = os.path.join(
        #                     os.path.dirname(current_dir()), "download"
        #                 )
        #
        #                 prefs = {"download.default_directory": default_download_directory}
        #                 chrome_options = selenium_webdriver.ChromeOptions()
        #                 chrome_options.add_argument("--incognito")
        #                 chrome_options.add_argument("disable-infobars")
        #                 chrome_options.add_argument("start-maximized")
        #                 chrome_options.add_experimental_option("prefs", prefs)
        #                 if is_no_sandbox:
        #                     chrome_options.add_argument("--no-sandbox")
        #                 if is_headless:
        #                     chrome_options.add_argument("--headless")
        #                 driver = selenium_webdriver.Chrome(
        #                     options=chrome_options, executable_path=local_webdriver_path
        #                 )
        #             else:
        #                 fail("only support chrome")
        #         else:
        #             while True:
        #                 try:
        #                     driver = selenium_webdriver.Remote(
        #                         command_executor=selenium_hub_url,
        #                         desired_capabilities={
        #                             "browserName": browser,
        #                             "javascriptEnabled": True,
        #                             "goog:chromeOptions": {
        #                                 "args": ["--incognito"],
        #                                 # "excludeSwitches": ["enable-automation"],
        #                                 # "useAutomationExtension": False,  # Removes message Chrome is being controlled by automated software
        #                             },  # remote driver launches in Incognito mode
        #                         },
        #                     )
        #
        #                     break
        #                 except Exception:
        #                     now = time.time()
        #                     if now - start_time >= timeout:
        #                         raise
        #                     time.sleep(1)
        #                 try_number += 1

        with And(
            "I set implicit wait time",
            description=f"{self.context.global_wait_time} sec",
        ):
            driver.implicit_wait = self.context.global_wait_time
            driver.implicitly_wait(self.context.global_wait_time)

        yield driver

    finally:
        if cleanup:
            with Finally("close webdriver"):
                driver.close()


@TestStep(Given)
def create_driver(self, incognito=True, cleanup=True):
    """Create a driver based on the arguments in the context."""
    driver = webdriver(
        browser=self.context.browser,
        local=self.context.local
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
                open_new_dashboard_view()

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