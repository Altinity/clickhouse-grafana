from testflows.core import *

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By as SelectBy

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
    with By("checking alert success"):
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
def click_save_and_test_button(self):
    """Click submit button."""

    locators.save_and_test_button.click()


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

    locators.choose_access_type().send_keys(access_type)
    locators.choose_access_type().send_keys(Keys.ENTER)


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
def click_forward_oauth_identity_toggle(self):
    """Click forward oauth identity toggle."""

    locators.forward_oauth_identity_toggle.click()


@TestStep(When)
def click_use_post_method_toggle(self):
    """Click forward oauth identity toggle."""

    locators.use_post_method_to_send_queries.click()


@TestStep(When)
def enter_clickhouse_username(self, username):
    """Enter ClickHouse username into the username textfield."""

    locators.username_textfield.send_keys(username)


@TestStep(When)
def enter_clickhouse_password(self, password):
    """Enter ClickHouse password into the password textfield."""

    locators.password_textfield.send_keys(password)


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
