from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


def _is_legacy(grafana_version):
    """Grafana <= 10 uses react-select inputs and data-rbd draggable ids."""
    return (grafana_version is not None) and (int(grafana_version.split(".")[0]) <= 10)


class Locators:
    # Locators for panel page

    def _in_query_row(self, query_name, grafana_version, tail_legacy, tail_modern):
        """Find an element inside the query row; legacy uses text/react-select
        anchors, modern uses the plugin's own data-testid attributes."""
        driver: WebDriver = current().context.driver
        if _is_legacy(grafana_version):
            return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rbd-draggable-id, "{query_name}")]{tail_legacy}')
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@data-rfd-draggable-id, "{query_name}")]{tail_modern}')

    def input_in_sql_editor(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            "//*[@class='inputarea monaco-mouse-cursor-text']",
            "//*[@class='inputarea monaco-mouse-cursor-text']",
        )

    def extrapolation_toggle(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Extrapolation"]/..//*[contains(@for,"switch")]',
            '//input[@data-testid="extrapolate-switch"]/following-sibling::label',
        )

    def step_textfield(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Step"]/..//input',
            '//input[@data-testid="interval-input"]',
        )

    def resolution_dropdown(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Resolution"]/..//input[contains(@id, "react-select")]',
            '//input[@data-testid="resolution-select-input"]',
        )

    def format_as_dropdown(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Format As"]/..//input[contains(@id, "react-select")]',
            '//input[@data-testid="format-as-select-input"]',
        )

    def add_metadata_toggle(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Add metadata"]/..//*[contains(@for,"switch")]',
            '//input[@data-testid="metadata-switch"]/following-sibling::label',
        )

    def skip_comments_toggle(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Skip Comments"]/..//*[contains(@for,"switch")]',
            '//input[@data-testid="skip-comments-switch"]/following-sibling::label',
        )

    def use_window_fuctions_toggle(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Use window functions"]/..//*[contains(@for,"switch")]',
            '//input[@data-testid="use-window-func-for-macros"]/following-sibling::label',
        )

    def round_textfield(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Round"]/..//input',
            '//input[@data-testid="round-input"]',
        )

    def show_help_button(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//button[.//text()="Show help"]',
            '//button[.//text()="Show help"]',
        )

    def show_generated_sql_button(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//button[.//text()="Show generated SQL"]',
            '//button[.//text()="Show generated SQL"]',
        )

    def reformatted_query(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            "//pre",
            "//pre",
        )

    def help_macros(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//h5[text()="Macros"]/..//pre[1]',
            '//h5[text()="Macros"]/..//pre[1]',
        )

    def help_functions(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//h5[text()="Macros"]/..//pre[2]',
            '//h5[text()="Macros"]/..//pre[2]',
        )

    def context_window(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Context window"]/..//input[contains(@id, "react-select")]',
            '//input[@data-testid="context-window-size-select-input"]',
        )

    def context_window_grafana_select_value_container(self, query_name, grafana_version=None):
        return self._in_query_row(
            query_name, grafana_version,
            '//*[./text()="Context window"]/..//*[@data-testid="context-window-size-select"]/div[contains(@class, "singleValue")]',
            '//*[./text()="Context window"]/..//*[@data-testid="context-window-size-select"]/div[contains(@class, "singleValue")]',
        )

locators = Locators()
