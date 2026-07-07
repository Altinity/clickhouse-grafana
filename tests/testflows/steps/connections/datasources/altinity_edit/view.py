from testflows.core import *

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy
from steps.delay import delay
from steps.connections.datasources.altinity_edit.locators import locators

import steps.ui as ui


@TestStep(Then)
def check_alert_success(self):
    """Check save and test button returns success alert."""
    with By("checking alert success"):
        try:
            ui.wait_for_element_to_be_visible(
                select_type=SelectBy.CSS_SELECTOR,
                element=f"[data-testid='data-testid Alert success']"
            )
            return True
        except:
            return False


@TestStep(Then)
def check_alert_not_success(self):
    """Check save and test button returns success alert."""
    with By("checking alert not success"):
        try:
            ui.wait_for_element_to_be_visible(
                select_type=SelectBy.CSS_SELECTOR,
                element=f"[data-testid='data-testid Alert error']"
            )
            return True
        except:
            return False


@TestStep(When)
def enter_name_into_name_field(self, datasource_name):
    """Enter name into name field."""
    if locators.name_fields():
        # Grafana <= 12.x: plain name input on the settings page
        locators.name_field.clear()
        locators.name_field.send_keys(datasource_name)
        return

    # Grafana >= 13.1: the name is an inline-editable page title. Use a JS click
    # for the pencil: a lingering save-confirmation toast can overlay it and
    # intercept a regular click.
    self.context.driver.execute_script("arguments[0].click();", locators.edit_title_button)
    rename_input = locators.rename_input
    rename_input.send_keys(Keys.CONTROL, 'a')
    rename_input.send_keys(datasource_name)
    rename_input.send_keys(Keys.ENTER)


@TestStep(When)
def enter_url_into_url_field(self, url):
    """Enter url into url field."""

    locators.url_field.send_keys(url)


@TestStep(When)
def get_url_textfield_text(self):
    """Get url from url textfield."""

    return locators.url_field.get_attribute('value')


@TestStep(When)
def click_save_and_test_button(self):
    """Click submit button."""

    # JS click: the save confirmation toast from a previous scenario can
    # overlay the button and intercept a regular click
    self.context.driver.execute_script("arguments[0].click();", locators.save_and_test_button)


@TestStep(When)
def click_default_toggle(self):
    """Click default toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.default_toggle)


@TestStep(When)
def ensure_default_after_save(self):
    """Re-apply the default flag after saving on Grafana >= 13.1.

    The Make default header button acts immediately and independently of the
    settings form, so a later Save & test overwrites isDefault back to false.
    No-op on older Grafana (no such button) and when already default."""
    import time
    from selenium.webdriver.common.by import By as SelectBy
    driver = self.context.driver
    buttons = driver.find_elements(SelectBy.XPATH, "//button[.//text()='Make default']")
    if buttons:
        driver.execute_script("arguments[0].click();", buttons[0])
        time.sleep(1)
        # the action asks for confirmation in a modal dialog
        confirm = driver.find_elements(SelectBy.XPATH, "//div[@role='dialog']//button[.//text()='Confirm']")
        if confirm:
            driver.execute_script("arguments[0].click();", confirm[0])


@TestStep(When)
def click_delete_datasource(self):
    """Click delete datasource button."""

    self.context.driver.execute_script("arguments[0].click();", locators.delete_button)


@TestStep(When)
def click_confirm_delete_datasource(self):
    """Click delete datasource button in confirmation modal dialog."""

    self.context.driver.execute_script("arguments[0].click();", locators.confirm_delete_button)


@TestStep(When)
def click_access_dropdown(self):
    """Click access dropdown."""

    self.context.driver.execute_script("arguments[0].click();", locators.access_dropdown())


@TestStep(When)
def choose_access_type_in_access_dropdown(self, access_type):
    """Choose access type in access dropdown."""

    if access_type == "Browser":
        self.context.driver.execute_script("arguments[0].click();", locators.browser_access_button)
    elif access_type == "Server":
        self.context.driver.execute_script("arguments[0].click();", locators.server_access_button)


@TestStep(When)
def click_basic_auth_toggle(self):
    """Click basic auth toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.basic_auth_toggle)


@TestStep(When)
def click_with_credentials_toggle(self):
    """Click with credentials toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.with_credentials_toggle)


@TestStep(When)
def click_tls_client_auth_toggle(self):
    """Click tls client auth toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.tls_client_auth_toggle)


@TestStep(When)
def click_with_ca_cert_toggle(self):
    """Click with ca cert toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.with_ca_cert_toggle)


@TestStep(When)
def click_skip_tls_verify_toggle(self):
    """Click with tls verify toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.skip_tls_verify_toggle)


@TestStep(When)
def enter_default_database(self, database_name):
    """Enter default database into default database textfield."""

    ActionChains(self.context.driver).double_click(locators.default_database_textfield).click(locators.default_database_textfield).perform()
    locators.default_database_textfield.send_keys(database_name)


@TestStep(When)
def click_forward_oauth_identity_toggle(self):
    """Click forward oauth identity toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.forward_oauth_identity_toggle)


@TestStep(When)
def click_use_post_method_toggle(self):
    """Click forward oauth identity toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.use_post_method_to_send_queries)


@TestStep(When)
def click_use_default_values_toggle(self):
    """Click `Use default values toggle`."""

    self.context.driver.execute_script("arguments[0].click();", locators.use_default_values_toggle)


@TestStep(When)
def click_add_cors_flag_to_request_toggle(self):
    """Click add CORS flag to request toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.add_cors_flag_to_requests)


@TestStep(When)
def click_use_compression_toggle(self):
    """Click Use Compression toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.use_compression)


@TestStep(When)
def enter_compression_type(self, compression_type):
    """Enter Compression type."""

    locators.compression_type_input.send_keys(compression_type)
    locators.compression_type_input.send_keys(Keys.ENTER)


@TestStep(When)
def click_use_yandex_cloud_authorization_toggle(self):
    """Click Use Yandex.Cloud authorization header toggle."""

    self.context.driver.execute_script("arguments[0].click();", locators.use_yandex_cloud_authorization_toggle)


@TestStep(When)
def enter_clickhouse_username(self, username):
    """Enter ClickHouse username into the username textfield."""

    locators.username_textfield.send_keys(username)


@TestStep(When)
def enter_clickhouse_password(self, password):
    """Enter ClickHouse password into the password textfield."""

    locators.password_textfield.send_keys(password)


@TestStep(When)
def enter_clickhouse_yandex_cloud_username(self, username):
    """Enter ClickHouse Yandex.Cloud username into the username textfield."""

    locators.yandex_cloud_username_textfield.send_keys(username)


@TestStep(When)
def enter_clickhouse_yandex_cloud_password(self, password):
    """Enter ClickHouse Yandex.Cloud password into the username textfield."""

    locators.yandex_cloud_password_textfield.send_keys(password)


@TestStep(When)
def enter_ca_cert(self, ca_cert=None):
    """Enter CA Cert into CA Cert textfield."""
    if ca_cert is None:
        ca_cert = self.context.ca_cert

    locators.ca_cert_textfield.send_keys(ca_cert)


@TestStep(When)
def enter_client_cert(self, client_cert=None):
    """Enter Client Cert into Client Cert textfield."""
    if client_cert is None:
        client_cert = self.context.client_cert

    locators.client_cert_textfield.send_keys(client_cert)


@TestStep(When)
def enter_client_key(self, client_key=None):
    """Enter Client Key into Client Key textfield."""
    if client_key is None:
        client_key = self.context.client_key

    locators.client_key_textfield.send_keys(client_key)


@TestStep(When)
def enter_server_name(self, server_name=None):
    """Enter Server Name into Server Name textfield."""
    if server_name is None:
        server_name = self.context.server_name

    locators.server_name_textfield.send_keys(server_name)


@TestStep(When)
def enter_column_timestamp_type(self, column_timestamp_type):
    """Enter column timestamp type."""

    self.context.driver.execute_script("arguments[0].click();", locators.column_timestamp_type_field)
    locators.column_timestamp_type_field.send_keys(column_timestamp_type)
    locators.column_timestamp_type_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_datetime_field(self, datetime):
    """Enter datetime field."""

    self.context.driver.execute_script("arguments[0].click();", locators.datetime_field)
    locators.datetime_field.send_keys(datetime)
    locators.datetime_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_timestamp_field(self, timestamp):
    """Enter timestamp field."""

    self.context.driver.execute_script("arguments[0].click();", locators.timestamp_field)
    locators.timestamp_field.send_keys(timestamp)
    locators.timestamp_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_datetime64_field(self, datetime64):
    """Enter datetime64 field."""

    self.context.driver.execute_script("arguments[0].click();", locators.datetime64_field)
    locators.datetime64_field.send_keys(datetime64)
    locators.datetime64_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_float_field(self, float):
    """Enter float field."""

    self.context.driver.execute_script("arguments[0].click();", locators.float_field)
    locators.float_field.send_keys(float)
    locators.float_field.send_keys(Keys.ENTER)

@TestStep(When)
def enter_timestamp_64_3_field(self, timestamp_64_3):
    """Enter Timestamp64(3) field."""

    self.context.driver.execute_script("arguments[0].click();", locators.timestamp_64_3_field)
    locators.timestamp_64_3_field.send_keys(timestamp_64_3)
    locators.timestamp_64_3_field.send_keys(Keys.ENTER)

@TestStep(When)
def enter_timestamp_64_6_field(self, timestamp_64_6):
    """Enter Timestamp64(6) field."""

    self.context.driver.execute_script("arguments[0].click();", locators.timestamp_64_6_field)
    locators.timestamp_64_6_field.send_keys(timestamp_64_6)
    locators.timestamp_64_6_field.send_keys(Keys.ENTER)

@TestStep(When)
def enter_timestamp_64_9_field(self, timestamp_64_9):
    """Enter Timestamp64(9) field."""

    self.context.driver.execute_script("arguments[0].click();", locators.timestamp_64_9_field)
    locators.timestamp_64_9_field.send_keys(timestamp_64_9)
    locators.timestamp_64_9_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_date_field(self, date):
    """Enter date field."""

    self.context.driver.execute_script("arguments[0].click();", locators.date_field)
    locators.date_field.send_keys(date)
    locators.date_field.send_keys(Keys.ENTER)

@TestStep(When)
def select_adhoc_query(self):
    """Select input query using triple click on textarea."""

    ActionChains(self.context.driver).double_click(locators.configure_adhoc_filter_request).click(locators.configure_adhoc_filter_request).perform()

@TestStep(When)
def enter_configure_adhoc_filter_request(self, adhoc_request):

    with By("selecting adhoc request"):
        with delay():
            select_adhoc_query()

    with By("entering adhoc request"):
        with delay():
            locators.configure_adhoc_filter_request_input.send_keys(adhoc_request)

@TestStep(When)
def enter_context_window_field(self, context_window):
    """Enter context window field."""

    self.context.driver.execute_script("arguments[0].click();", locators.context_window_field)
    locators.context_window_field.send_keys(context_window)
    locators.context_window_field.send_keys(Keys.ENTER)


@TestStep(Then)
def get_column_timestamp_type(self):
    """Get column timestamp type value."""

    return locators.column_timestamp_type_field.get_attribute('value')


@TestStep(Then)
def get_datetime_field(self):
    """Get datetime field value."""

    return locators.datetime_field.get_attribute('value')


@TestStep(Then)
def get_timestamp_field(self):
    """Get timestamp field value."""

    return locators.timestamp_field.get_attribute('value')


@TestStep(Then)
def get_datetime64_field(self):
    """Get datetime64 field value."""

    return locators.datetime64_field.get_attribute('value')


@TestStep(Then)
def get_date_field(self):
    """Get date field value."""

    return locators.date_field.get_attribute('value')


@TestStep(Then)
def get_column_timestamp_type_placeholder(self):
    """Get column timestamp type value."""

    return locators.column_timestamp_type_field.get_attribute('placeholder')


@TestStep(Then)
def get_datetime_field_placeholder(self):
    """Get datetime field value."""

    return locators.datetime_field.get_attribute('placeholder')


@TestStep(Then)
def get_timestamp_field_placeholder(self):
    """Get timestamp field value."""

    return locators.timestamp_field.get_attribute('placeholder')


@TestStep(Then)
def get_datetime64_field_placeholder(self):
    """Get datetime64 field value."""

    return locators.datetime64_field.get_attribute('placeholder')


@TestStep(Then)
def get_date_field_placeholder(self):
    """Get date field value."""

    return locators.date_field.get_attribute('placeholder')
