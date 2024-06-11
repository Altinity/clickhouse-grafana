import cv2 as cv
import numpy as np
from PIL import Image
from PIL import ImageFilter

from testflows.core import *
from steps.delay import delay
from testflows.asserts import error

import steps.dashboard.view as dashboard
import steps.dashboards.view as dashboards
import steps.connections.datasources.view as datasources
import steps.connections.datasources.new.view as datasources_new
import steps.connections.datasources.altinity_edit.view as datasources_altinity_edit


@TestStep(Then)
def compare_screenshots(self, screenshot_name_1, screenshot_name_2):
    """Check that screenshots are similar."""
    image_1 = Image.open(f"./tests/testflows/screenshots/{screenshot_name_1}.png")
    image_2 = Image.open(f"./tests/testflows/screenshots/{screenshot_name_2}.png")
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
        image = Image.open(f"./tests/testflows/screenshots/{screenshot_name}.png")

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


@TestStep(Given)
def create_new_altinity_datasource(
        self,
        datasource_name,
        url,
        successful_connection=True,
        access_type=None,
        basic_auth=False,
        username="default",
        password="",
        with_credentials=False,
        tls_client_auth=False,
        server_name=None,
        client_cert=None,
        client_key=None,
        with_ca_cert=False,
        ca_cert=None,
        skip_tls_verify=False,
        forward_oauth_identity=False,
        use_post_method=False,
):
    """Create new datasource."""
    try:
        with Given("I create new Altinity datasource"):
            with delay():
                with By("opening create new datasource view"):
                    datasources_new.open_add_new_datasource_endpoint()

            with delay():
                with And("clicking new altinity grafana plugin"):
                    datasources_new.click_new_altinity_plugin_datasource()

            with delay():
                with And("entering datasource name"):
                    datasources_altinity_edit.enter_name_into_name_field(datasource_name=datasource_name)

            with delay():
                with By("entering url"):
                    datasources_altinity_edit.enter_url_into_url_field(url=url)

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

            if use_post_method:
                with delay():
                    with By("clicking use post method toggle"):
                        datasources_altinity_edit.click_use_post_method_toggle()

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
