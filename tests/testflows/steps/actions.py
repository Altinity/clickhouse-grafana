import os
import cv2 as cv
import numpy as np
from PIL import Image
from PIL import ImageFilter

from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

import steps.panel.view as panel
import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.connections.datasources.view as datasources
import steps.panel.query_settings.view as query_settings
import steps.connections.datasources.new.view as datasources_new
import steps.alerting.alert_rules_legacy.new.view as alert_rules_legacy
import steps.connections.datasources.altinity_edit.view as datasources_altinity_edit


@TestStep(Then)
def compare_screenshots(self, screenshot_name_1, screenshot_name_2):
    """Check that screenshots are similar."""
    image_1 = Image.open(os.path.join(self.context.project_root_dir, 'tests', 'testflows', 'screenshots', f"{screenshot_name_1}.png"))
    image_2 = Image.open(os.path.join(self.context.project_root_dir, 'tests', 'testflows', 'screenshots', f"{screenshot_name_2}.png"))
    return image_1 == image_2


@TestStep(Given)
def create_dashboard(self, dashboard_name, open_it=True):
    """Create new dashboard named {dashboard_name} and open it."""
    try:
        for attempt in retries(delay=10, timeout=120):
            with attempt:
                with delay():
                    with When("I open new dashboard view"):
                        dashboard.open_new_dashboard_endpoint()

                with And("I save new dashboard"):
                    dashboard.saving_dashboard(dashboard_name=dashboard_name)

                with Then("I check dashboard created"):
                    dashboards.check_dashboard_exists(dashboard_name=dashboard_name)

                if open_it:
                    with Then("I open dashboard"):
                        dashboards.open_dashboard(dashboard_name=dashboard_name)
        yield
    finally:
        with Finally(f"I delete dashboard {dashboard_name}"):
            dashboards.delete_dashboard(dashboard_name=dashboard_name)


def distance(a, b):
    """Distance between two points."""
    return ((a[0] - b[0])**2 + (a[1]-b[1])**2)**(1/2)


@TestStep(Then)
def check_screenshot(self, screenshot_name):
    """Check that graph is valid."""
    with By("opening image"):
        image = Image.open(os.path.join(self.context.project_root_dir, 'tests', 'testflows', 'screenshots', f"{screenshot_name}.png"))

    with By("processing image"):
        red, green, blue, _ = image.split()
        threshold = 10
        im = green.point(lambda x: 255 if x > threshold else 0)
        threshold = 120
        bl = blue.point(lambda x: 255 if x < threshold else 0)
        threshold = 130
        re = red.point(lambda x: 255 if x < threshold else 0)
        threshold = 100
        gr = green.point(lambda x: 255 if x > threshold else 0)
        blank = image.point(lambda _: 0)
        segmented = Image.composite(image, blank, gr)
        segmented_1 = Image.composite(segmented, blank, bl)
        segmented_2 = Image.composite(segmented_1, blank, re)
        segmented_3 = segmented_2.filter(ImageFilter.GaussianBlur(3))
        threshold = 7
        segmented_4 = segmented_3.point(lambda x: 200 if x > threshold else 100)

    with And("finding contours in the image"):
        hsv_min = np.array((0, 54, 5), np.uint8)
        hsv_max = np.array((187, 255, 253), np.uint8)
        img = cv.cvtColor(np.array(segmented_4), cv.COLOR_RGBA2BGR)
        hsv = cv.cvtColor(img, cv.COLOR_BGR2HSV)
        thresh = cv.inRange(img, hsv_min, hsv_max)
        contours0, hierarchy = cv.findContours(thresh.copy(), cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)
        boxes = []

        for cnt in contours0:
            rect = cv.minAreaRect(cnt)
            box = cv.boxPoints(rect)
            box = np.int0(box)
            if (distance(box[0], box[1]) / distance(box[1], box[2]) > 10) or distance(box[0], box[1]) / distance(box[1], box[2]) < 1 / 10:
                boxes.append(box)

    return len(boxes) == 1


@TestStep(Then)
def check_screenshot_contains_green(self, screenshot_name, expected_green_pixels=3000):
    """Check that graph is valid."""
    with By("opening image"):
        image = Image.open(os.path.join(self.context.project_root_dir, 'tests', 'testflows', 'screenshots', f"{screenshot_name}.png"))

    with By("processing image"):
        red, green, blue, _ = image.split()
        threshold = 100
        gr = green.point(lambda x: 255 if x > threshold else 0)

    with By("checking graph contains enough green pixels"):
        return gr.histogram()[255] > expected_green_pixels


@TestStep(Given)
def create_new_altinity_datasource(
        self,
        datasource_name,
        url,
        default=False,
        successful_connection=True,
        access_type=None,
        basic_auth=False,
        username="default",
        password="",
        use_yandex_cloud_authorization=False,
        yandex_cloud_username="demo",
        yandex_cloud_password="demo",
        with_credentials=False,
        tls_client_auth=False,
        server_name=None,
        client_cert=None,
        client_key=None,
        with_ca_cert=False,
        ca_cert=None,
        skip_tls_verify=False,
        forward_oauth_identity=False,
        default_database=None,
        add_cors_flag=False,
        use_post_method=False,
        use_compression=False,
        use_default_values=False,
        default_column_timestamp_type=None,
        default_datetime_field=None,
        default_timestamp_field=None,
        default_datetime64_field=None,
        default_date_field=None,
):
    """Create new datasource.

    :param datasource_name: name of the datasource that we are creating
    :param url: url of the datasource that we are creating
    :param successful_connection: check that the `save and test` button in connection settings returns green or red alert, default: True
    :param access_type: access type in connections settings from ['Server(default)', 'Browser'], default: None
    :param basic_auth: use basic auth, default: False
    :param username: username for basic auth, default: 'demo'
    :param password: password for basic auth, default: 'demo'
    :param use_yandex_cloud_authorization: use Yandex.Cloud authorization, default: False
    :param yandex_cloud_username: username for Yandex.Cloud authorization, default 'demo'
    :param yandex_cloud_password: password for Yandex.Cloud authorization, default 'demo'
    :param tls_client_auth: use tls client auth, default: False
    :param server_name: server name for tls client auth, default: None
    :param client_cert: Client Cert for tls client auth, default: None
    :param client_key: Client Key for tls client auth, default: None
    :param with_ca_cert: use Ca Cert, default: False
    :param ca_cert: Ca Cert, default: None
    :param use_post_method: use post method in http requests, default: False
    """
    try:
        with Given("I create new Altinity datasource"):
            with delay():
                with By("opening create new datasource view"):
                    datasources_new.open_add_new_datasource_endpoint()

            with delay():
                with And("clicking new altinity grafana plugin"):
                    datasources_new.click_new_altinity_plugin_datasource()

            with delay():
                with By("entering url"):
                    datasources_altinity_edit.enter_url_into_url_field(url=url)

            if default:
                with delay():
                    with By("clicking default toggle"):
                        datasources_altinity_edit.click_default_toggle()

            if not (access_type is None):
                with delay():
                    with By("clicking access dropdown"):
                        datasources_altinity_edit.click_access_dropdown()

                with delay():
                    with And("choosing access type in dropdown"):
                        datasources_altinity_edit.choose_access_type_in_access_dropdown(access_type=access_type)

            if basic_auth:
                with delay():
                    with By("clicking basic auth toggle"):
                        datasources_altinity_edit.click_basic_auth_toggle()
                with delay():
                    with By("entering username"):
                        datasources_altinity_edit.enter_clickhouse_username(username=username)
                with delay():
                    with By("entering password"):
                        datasources_altinity_edit.enter_clickhouse_password(password=password)

            if use_yandex_cloud_authorization:
                with delay():
                    with By("clicking use Yandex.Cloud authorization toggle"):
                        datasources_altinity_edit.click_use_yandex_cloud_authorization_toggle()
                with delay():
                    with By("entering Yandex.Cloud username"):
                        datasources_altinity_edit.enter_clickhouse_yandex_cloud_username(username=yandex_cloud_username)
                with delay():
                    with By("entering Yandex.Cloud password"):
                        datasources_altinity_edit.enter_clickhouse_yandex_cloud_password(password=yandex_cloud_password)

            if tls_client_auth:
                with delay():
                    with By("clicking TLS Client Auth toggle"):
                        datasources_altinity_edit.click_tls_client_auth_toggle()
                with delay():
                    with By("entering server name"):
                        datasources_altinity_edit.enter_server_name(server_name=server_name)
                with delay():
                    with By("entering Client Cert"):
                        datasources_altinity_edit.enter_client_cert(client_cert=client_cert)
                with delay():
                    with By("entering Client Key"):
                        datasources_altinity_edit.enter_client_key(client_key=client_key)

            if with_ca_cert:
                with delay():
                    with By("clicking with CA Cert method"):
                        datasources_altinity_edit.click_with_ca_cert_toggle()
                with delay():
                    with By("entering CA Cert"):
                        datasources_altinity_edit.enter_ca_cert(ca_cert=ca_cert)

            if skip_tls_verify:
                with delay():
                    with By("clicking skip TLS verify toggle"):
                        datasources_altinity_edit.click_skip_tls_verify_toggle()

            if use_post_method:
                with delay():
                    with By("clicking use post method toggle"):
                        datasources_altinity_edit.click_use_post_method_toggle()

            if add_cors_flag:
                with delay():
                    with By("clicking add CORS flag toggle"):
                        datasources_altinity_edit.click_add_cors_flag_to_request_toggle()

            if not(default_database is None):
                with delay():
                    with By("entering default database"):
                        datasources_altinity_edit.enter_default_database(database_name=default_database)

            if use_compression:
                with delay():
                    with By("clicking use compression toggle"):
                        datasources_altinity_edit.click_use_compression_toggle()
                with delay():
                    with By("enter compression type"):
                        datasources_altinity_edit.enter_compression_type(compression_type='gzip')

            with delay():
                with And("entering datasource name"):
                    datasources_altinity_edit.enter_name_into_name_field(datasource_name=datasource_name)

            with delay():
                with By("clicking save and test button"):
                    datasources_altinity_edit.click_save_and_test_button()

            if use_default_values:
                with delay():
                    with By("clicking use default values toggle"):
                        datasources_altinity_edit.click_use_default_values_toggle()

                with delay():
                    if not(default_column_timestamp_type is None):
                        with By("setting up default timestamp type"):
                            datasources_altinity_edit.enter_column_timestamp_type(column_timestamp_type=default_column_timestamp_type)

                with delay():
                    if not (default_datetime_field is None):
                        with By("setting up default datetime field"):
                            datasources_altinity_edit.enter_datetime_field(
                                datetime=default_datetime_field)

                with delay():
                    if not (default_timestamp_field is None):
                        with By("setting up default timestamp field"):
                            datasources_altinity_edit.enter_timestamp_field(
                                timestamp=default_timestamp_field)

                with delay():
                    if not (default_datetime64_field is None):
                        with By("setting up default datetime64 type"):
                            datasources_altinity_edit.enter_datetime64_field(
                                datetime64=default_datetime64_field)

                with delay():
                    if not (default_date_field is None):
                        with By("setting up default date field"):
                            datasources_altinity_edit.enter_date_field(
                                date=default_date_field)

                with delay():
                    with By("clicking save and test button"):
                        datasources_altinity_edit.click_save_and_test_button()

            if successful_connection:
                with And("checking save and test button returns green alert"):
                    assert datasources_altinity_edit.check_alert_success() is True, error()
            else:
                with And("checking save and test button returns red alert"):
                    assert datasources_altinity_edit.check_alert_not_success() is True, error()
        yield
    finally:
        with Finally("I delete datasource"):
            with delay():
                with By("opening datasources view"):
                    datasources.open_connections_datasources_endpoint()
            with delay():
                with And(f"opening datasource setup view for {datasource_name}"):
                    datasources.click_datasource_in_datasources_view(datasource_name=datasource_name)
            with delay():
                with And("clicking delete button"):
                    datasources_altinity_edit.click_delete_datasource()
            with delay():
                with And("clicking delete button in confirmation modal dialog"):
                    datasources_altinity_edit.click_confirm_delete_datasource()


@TestStep(When)
def setup_legacy_alerts(
        self,
        alert_name="test_alert",
        evaluate_every='10s',
        evaluate_for='10s',
        param_value='0',
        new=True,
):
    with When("I go to alerts tab"):
        with delay():
            panel.click_alert_tab()

    if new:
        with And("I click `Create Alert`"):
            with delay():
                alert_rules_legacy.click_create_alert_button()

    with And("I enter alert name"):
        with delay():
            alert_rules_legacy.enter_name(alert_name=alert_name)

    with And("I enter `Evaluate every`"):
        with delay():
            alert_rules_legacy.enter_evaluate_every(evaluate_every=evaluate_every)

    with And("I enter `For`"):
        with delay():
            alert_rules_legacy.enter_for(evaluate_for=evaluate_for)

    with And("I enter input param for alert"):
        with delay():
            alert_rules_legacy.enter_input(param_number=0, param_value=param_value)


@TestStep(When)
def setup_query_settings(
        self,
        query_name="A",
        database="default",
        table="test_alerts",
        column_timestamp_type="DateTime",
        timestamp_column="EventTime",
        date_column="EventDate"
):
    """Setup all macro in Query Settings."""

    with When("I setup database"):
        with delay():
            query_settings.enter_database(query_name=query_name, database=database)

    with When("I setup table"):
        with delay():
            query_settings.enter_table(query_name=query_name, table=table)

    with When("I setup column timestamp type"):
        with delay():
            query_settings.enter_column_timestamp_type(query_name=query_name, column_timestamp_type=column_timestamp_type)

    with When("I setup timestamp column"):
        with delay():
            query_settings.enter_timestamp_column(query_name=query_name, timestamp_column=timestamp_column)

    with When("I setup date column"):
        with delay():
            query_settings.enter_date_column(query_name=query_name, date_column=date_column)
