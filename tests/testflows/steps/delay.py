import time

import testflows.settings as settings
from testflows.core import *
from contextlib import contextmanager


@contextmanager
def delay(before=None, after=None):

    if before is None:
        before = current().context.before

    if after is None:
        after = current().context.after

    # before
    if settings.debug:
        note(f"I sleep for {before} before step")
    time.sleep(before)
    yield
    # after
    if settings.debug:
        note(f"I sleep for {after} after step")
    time.sleep(after)