from testflows.core import *
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By as SelectBy


class Locators:
    # Locators for connections/datasources/altinity_edit page

    @property
    def name_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Data source settings page name input field']")

    @property
    def url_field(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-testid='data-testid Datasource HTTP settings url']")

    def access_dropdown(self, value="Server"):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[class*='input-wrapper width-20 gf-form-input']")

    def choose_access_type(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, f"[id='react-select-2-input']")

    @property
    def save_and_test_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='data-testid Data source settings page Save and Test button']")

    @property
    def basic_auth_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='http-settings-basic-auth']")

    @property
    def with_credentials_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='http-settings-with-credentials']")

    @property
    def tls_client_auth_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='http-settings-tls-client-auth']")

    @property
    def with_ca_cert_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='http-settings-ca-cert']")

    @property
    def skip_tls_verify_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='http-settings-skip-tls-verify']")

    @property
    def forward_oauth_identity_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='http-settings-forward-oauth']")

    @property
    def use_yandex_cloud_authorization_toggle(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='useYandexCloudAuthorization']")

    @property
    def add_cors_flag_to_requests(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='addCorsHeader']")

    @property
    def use_post_method_to_send_queries(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[for='usePOST']")

    @property
    def ca_cert_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[placeholder='Begins with -----BEGIN CERTIFICATE-----']")

    @property
    def client_cert_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[placeholder='Begins with -----BEGIN CERTIFICATE-----']")

    @property
    def client_key_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[placeholder='Begins with -----BEGIN RSA PRIVATE KEY-----']")

    @property
    def server_name_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[placeholder='domain.example.com']")

    @property
    def username_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[placeholder='user']")

    @property
    def password_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[placeholder='Password']")

    @property
    def yandex_cloud_username_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-test-id='x-header-user-input']")

    @property
    def yandex_cloud_password_textfield(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR, "[data-test-id='x-header-key-input']")

    @property
    def alert_success(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='data-testid Alert success']")

    @property
    def delete_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='Data source settings page Delete button']")

    @property
    def confirm_delete_button(self):
        driver: WebDriver = current().context.driver
        return driver.find_element(SelectBy.CSS_SELECTOR,
                                   "[data-testid='data-testid Confirm Modal Danger Button']")

locators = Locators()
