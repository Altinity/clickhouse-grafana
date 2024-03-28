from contextlib import contextmanager
from testflows.core import *
import time


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