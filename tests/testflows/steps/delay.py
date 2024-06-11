import time

from testflows.core import *
from contextlib import contextmanager


@contextmanager
def delay(before=None, after=None):

    if before is None:
        before = current().context.before

    if after is None:
        after = current().context.after

    # before
    note(f"I sleep for {before} before step")
    time.sleep(before)
    yield
    # after
    note(f"I sleep for {after} after step")
    time.sleep(after)