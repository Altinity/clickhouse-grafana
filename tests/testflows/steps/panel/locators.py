from PIL.ImImagePlugin import number
from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for panel page

    @property
    def fill(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id*='option-0-radiogroup']")

    @property
    def actual(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id*='option-2-radiogroup']")

    @property
    def visualization(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid panel content']")

    @property
    def select_datasource_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Select a data source']")

    def select_datasource(self, datasource_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f"//div[@data-testid='data-source-card' and .//text()='{datasource_name}']")

    def sql_editor_toggle(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"

        return driver.find_element(SelectBy.XPATH, f"//*[contains(@{search_class}, '{query_name}')]//*[contains(@id, 'option-sql')]")

    def sql_editor_input(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f"//*[contains(@{search_class}, '{query_name}')]//*[@class='view-lines monaco-mouse-cursor-text']")

    def input_in_sql_editor(self, query_name='A', grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f"//*[contains(@{search_class}, '{query_name}')]//*[@class='inputarea monaco-mouse-cursor-text']")

    @property
    def panel_title_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id='PanelFrameTitle']")
    
    @property
    def repeat_by_variable_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[id='repeat-by-variable-select']")

    @property
    def panel_error(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Panel status error']")

    @property
    def panel_error_for_table_view(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[aria-label='Panel header error']")

    @property
    def query_inspector_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[aria-label='Query inspector button']")

    @property
    def query_inspector_refresh_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[aria-label='Panel inspector Query refresh button']")

    @property
    def query_inspector_data_tab(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Tab Data']")

    @property
    def query_inspector_data_options_expand_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//*[@aria-label='Panel inspector Data content']//button[@aria-label='Expand query row']")

    @property
    def query_inspector_data_options_dropdown(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//*[@aria-label='Panel inspector Data content']//input[@aria-label='Select dataframe']")

    @property
    def query_inspector_download_csv_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//*[text()='Download CSV']/../../button")

    @property
    def query_inspector_url(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, "//*[(@class='json-formatter-string' and "
                                                   "contains(text(), 'api')) or "
                                                   "(@class='json-formatter-string json-formatter-url' and "
                                                   "contains(text(), 'http'))]")

    @property
    def add_query_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid query-tab-add-query']")

    @property
    def expression_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='query-tab-add-expression']")

    def query_name_field(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//button[@data-testid="query-name-div"]')

    def query_name_textfield(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//button[@data-testid="query-name-div"]//input')

    def duplicate_query_button(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//button[@data-testid="data-testid Duplicate query"]')

    def hide_response_query_button(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//button[@data-testid="data-testid Hide response"]')

    def delete_query_button(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//button[@data-testid="data-testid Remove query"]')

    def expression_name_field(self, expression_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{expression_name}")]//button[@data-testid="query-name-div"]')

    def expression_name_textfield(self, expression_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{expression_name}")]//button[@data-testid="query-name-div"]//input')

    def expression_query_button(self, expression_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{expression_name}")]//button[@data-testid="data-testid Duplicate query"]')

    def hide_response_expression_button(self, expression_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{expression_name}")]//button[@data-testid="data-testid Hide response"]')

    def delete_expression_button(self, expression_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{expression_name}")]//button[@data-testid="data-testid Remove query"]')

    def expression_operation_dropdown(self, expression_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{expression_name}")]//div[contains(@class, "grafana-select-value-container")]')

    def expression_textfield(self, expression_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(@{search_class}, "{expression_name}")]//div[contains(@class, "grafana-select-value-container")]')

    @property
    def time_picker_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid TimePicker Open Button"]')

    @property
    def time_picker_from_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Time Range from field"]')

    @property
    def time_picker_to_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Time Range to field"]')

    @property
    def time_picker_submit_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid TimePicker submit button"]')

    def data_source_picker(self, query_name, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            search_class = "data-rbd-draggable-id"
        else:
            search_class = "data-rfd-draggable-id"
        return driver.find_element(SelectBy.XPATH, f'//*[contains(@{search_class}, "{query_name}")]//input[@data-testid="data-testid Select a data source"]')

    @property
    def apply_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Apply changes and go back to dashboard"]')

    def save_button(self, grafana_version):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[title="Apply changes and save dashboard"]')
        else:
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Save dashboard button"]')

    def save_confirmations_button(self, grafana_version):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[aria-label="Dashboard settings Save Dashboard Modal Save button"]')
        else:
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Save dashboard drawer button"]')

    def discard_button(self, grafana_version):
        driver: WebDriver = current().context.driver
        if not (grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[title="Undo all changes"]')
        else:
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Discard changes button"]')

    @property
    def run_query_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//div[contains(@id, "A")]//button')

    @property
    def data_is_missing_text(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[text()="Data is missing a time field"]')

    @property
    def no_data_text(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[text()="No data"]')

    @property
    def table_view_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[for="table-view"]')

    def table_column_name(self, column_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[text()="{column_name}"]')

    def column_row(self, time):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[text()="{time}"]/../[1]')

    def alert_tab(self, grafana_version=None):
        driver: WebDriver = current().context.driver
        if not(grafana_version is None) and (int(grafana_version.split(".")[0]) <= 10):
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[aria-label="Tab Alert"]')
        else:
            return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Tab Alert"]')

    @property
    def query_inspector_close_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid Drawer close"]')

    def adhoc_dropdown(self, label):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[@data-testid="data-testid Dashboard template variables submenu Label {label}"]/..//input')


    def variable_dropdown(self, variable_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[@data-testid="data-testid Dashboard template variables submenu Label {variable_name}"]/..//input')


    def variable(self, variable_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[@data-testid="data-testid Dashboard template variables submenu Label {variable_name}"]/../div')



    def adhoc(self, adhoc_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//*[@aria-label="Edit filter with key {adhoc_name}"]')

    @property
    def add_adhoc_filter_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[placeholder="Filter by label values"]')

    def remove_adhoc_button(self, adhoc_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[aria-label="Remove filter with key {adhoc_name}"]')
      
    @property
    def refresh_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f'[data-testid="data-testid RefreshPicker run button"]')

    def annotation_toggle(self, annotation_name):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//label[@data-testid="data-testid Dashboard template variables submenu Label {annotation_name}"]/..//div/label')

    def label_textfield(self, label):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH,
                                   f'//*[contains(text(), "{label}")]')
    
    @property
    def back_to_dashboard_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.XPATH, f'//button[@data-testid="data-testid Back to dashboard button"]')

locators = Locators()
