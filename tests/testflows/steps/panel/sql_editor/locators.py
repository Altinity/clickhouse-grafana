from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for panel page

    def input_in_sql_editor(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f"//*[contains(@{search_class}, '{query_name}')]//*[@class='inputarea monaco-mouse-cursor-text']")

    def extrapolation_toggle(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Extrapolation"]/..//*[contains(@for,"switch")]')

    def step_textfield(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Step"]/..//input')

    def resolution_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Resolution"]/..//input[contains(@id, "react-select")]')

    def format_as_dropdown(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Format As"]/..//input[contains(@id, "react-select")]')

    def add_metadata_toggle(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Add metadata"]/..//*[contains(@for,"switch")]')

    def skip_comments_toggle(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Skip Comments"]/..//*[contains(@for,"switch")]')

    def round_textfield(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//*[./text()="Round"]/..//input')

    def show_help_button(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//button[.//text()="Show help"]')

    def show_generated_sql_button(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//button[.//text()="Show generated SQL"]')

    def reformatted_query(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//pre')

    def help_macros(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//h5[text()="Macros"]/..//pre[1]')

    def help_functions(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
          search_class = "data-rbd-draggable-id"
        else:
          search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{query_name}")]//h5[text()="Macros"]/..//pre[2]')


locators = Locators()
