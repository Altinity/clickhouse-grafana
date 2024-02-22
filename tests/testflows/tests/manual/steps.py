from testflows.core import *


@TestStep(Given)
def create_table(self, insert_data=True):
    try:
        with When("I create table"):
            pass

        if insert_data:
            with When("I insert data into the table"):
                pass

        yield 1
    finally:
        with Finally("I delete table"):
            pass


@TestStep(Given)
def create_user(self):
    try:
        with When("I create new user", description="username=test, password=test"):
            pass
        yield 1
    finally:
        with Finally("I delete new user"):
            pass


@TestStep(Given)
def create_dashboard(self):
    try:
        with When("I create dashboard"):
            pass
        yield 1
    finally:
        with Finally("I delete dashboard"):
            pass


@TestStep(Given)
def create_panel(self):
    try:
        with When("I create panel"):
            pass
        yield 1
    finally:
        with Finally("I delete panel"):
            pass


@TestStep(Given)
def add_variable(self, variable_type):
    try:
        with When(f"I add variable with {variable_type} type"):
            pass
        yield 1
    finally:
        with Finally("I delete variable"):
            pass
