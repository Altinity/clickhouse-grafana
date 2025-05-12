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
    locators.name_field.clear()
    locators.name_field.send_keys(datasource_name)


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

    locators.save_and_test_button.click()


@TestStep(When)
def click_default_toggle(self):
    """Click default toggle."""

    locators.default_toggle.click()


@TestStep(When)
def click_delete_datasource(self):
    """Click delete datasource button."""

    locators.delete_button.click()


@TestStep(When)
def click_confirm_delete_datasource(self):
    """Click delete datasource button in confirmation modal dialog."""

    locators.confirm_delete_button.click()


@TestStep(When)
def click_access_dropdown(self):
    """Click access dropdown."""

    locators.access_dropdown().click()


@TestStep(When)
def choose_access_type_in_access_dropdown(self, access_type):
    """Choose access type in access dropdown."""

    if access_type == "Browser":
        locators.browser_access_button.click()
    elif access_type == "Server":
        locators.server_access_button.click()


@TestStep(When)
def click_basic_auth_toggle(self):
    """Click basic auth toggle."""

    locators.basic_auth_toggle.click()


@TestStep(When)
def click_with_credentials_toggle(self):
    """Click with credentials toggle."""

    locators.with_credentials_toggle.click()


@TestStep(When)
def click_tls_client_auth_toggle(self):
    """Click tls client auth toggle."""

    locators.tls_client_auth_toggle.click()


@TestStep(When)
def click_with_ca_cert_toggle(self):
    """Click with ca cert toggle."""

    locators.with_ca_cert_toggle.click()


@TestStep(When)
def click_skip_tls_verify_toggle(self):
    """Click with tls verify toggle."""

    locators.skip_tls_verify_toggle.click()


@TestStep(When)
def enter_default_database(self, database_name):
    """Enter default database into default database textfield."""

    ActionChains(self.context.driver).double_click(locators.default_database_textfield).click(locators.default_database_textfield).perform()
    locators.default_database_textfield.send_keys(database_name)


@TestStep(When)
def click_forward_oauth_identity_toggle(self):
    """Click forward oauth identity toggle."""

    locators.forward_oauth_identity_toggle.click()


@TestStep(When)
def click_use_post_method_toggle(self):
    """Click forward oauth identity toggle."""

    locators.use_post_method_to_send_queries.click()


@TestStep(When)
def click_use_default_values_toggle(self):
    """Click `Use default values toggle`."""

    locators.use_default_values_toggle.click()


@TestStep(When)
def click_add_cors_flag_to_request_toggle(self):
    """Click add CORS flag to request toggle."""

    locators.add_cors_flag_to_requests.click()


@TestStep(When)
def click_use_compression_toggle(self):
    """Click Use Compression toggle."""

    locators.use_compression.click()


@TestStep(When)
def enter_compression_type(self, compression_type):
    """Enter Compression type."""

    locators.compression_type_input.send_keys(compression_type)
    locators.compression_type_input.send_keys(Keys.ENTER)


@TestStep(When)
def click_use_yandex_cloud_authorization_toggle(self):
    """Click Use Yandex.Cloud authorization header toggle."""

    locators.use_yandex_cloud_authorization_toggle.click()


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

    locators.column_timestamp_type_field.click()
    locators.column_timestamp_type_field.send_keys(column_timestamp_type)
    locators.column_timestamp_type_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_datetime_field(self, datetime):
    """Enter datetime field."""

    locators.datetime_field.click()
    locators.datetime_field.send_keys(datetime)
    locators.datetime_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_timestamp_field(self, timestamp):
    """Enter timestamp field."""

    locators.timestamp_field.click()
    locators.timestamp_field.send_keys(timestamp)
    locators.timestamp_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_datetime64_field(self, datetime64):
    """Enter datetime64 field."""

    locators.datetime64_field.click()
    locators.datetime64_field.send_keys(datetime64)
    locators.datetime64_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_float_field(self, float):
    """Enter float field."""

    locators.float_field.click()
    locators.float_field.send_keys(float)
    locators.float_field.send_keys(Keys.ENTER)

@TestStep(When)
def enter_timestamp_64_3_field(self, timestamp_64_3):
    """Enter Timestamp64(3) field."""

    locators.timestamp_64_3_field.click()
    locators.timestamp_64_3_field.send_keys(timestamp_64_3)
    locators.timestamp_64_3_field.send_keys(Keys.ENTER)

@TestStep(When)
def enter_timestamp_64_6_field(self, timestamp_64_6):
    """Enter Timestamp64(6) field."""

    locators.timestamp_64_6_field.click()
    locators.timestamp_64_6_field.send_keys(timestamp_64_6)
    locators.timestamp_64_6_field.send_keys(Keys.ENTER)

@TestStep(When)
def enter_timestamp_64_9_field(self, timestamp_64_9):
    """Enter Timestamp64(9) field."""

    locators.timestamp_64_9_field.click()
    locators.timestamp_64_9_field.send_keys(timestamp_64_9)
    locators.timestamp_64_9_field.send_keys(Keys.ENTER)


@TestStep(When)
def enter_date_field(self, date):
    """Enter date field."""

    locators.date_field.click()
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

    locators.context_window_field.click()
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
