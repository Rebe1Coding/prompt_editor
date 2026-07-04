import json

import pytest
from fastapi.testclient import TestClient

from app.db import SessionRepository
from app.main import create_app
from app.storage import ResultStorage


class FakeEditor:
    def __init__(self):
        self.tokens = ["Испр", "авленный ", "промпт"]
        self.error = None
        self.seen_messages = None

    def messages_for_edit(self, source_prompt):
        return [("edit", source_prompt)]

    def messages_for_refine(self, source_prompt, revisions, instruction):
        return [("refine", source_prompt, len(revisions), instruction)]

    def messages_for_regenerate(self, source_prompt, revisions):
        return [("regenerate", source_prompt, len(revisions))]

    def stream(self, messages):
        self.seen_messages = messages
        for token in self.tokens:
            yield token
        if self.error is not None:
            raise RuntimeError(self.error)


@pytest.fixture
def repo(tmp_path):
    return SessionRepository(str(tmp_path / "test.db"))


@pytest.fixture
def storage(tmp_path):
    return ResultStorage(str(tmp_path / "results"))


@pytest.fixture
def editor():
    return FakeEditor()


@pytest.fixture
def client(repo, editor, storage):
    return TestClient(create_app(repo, editor, storage))


def read_sse(response):
    events = []
    for line in response.iter_lines():
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events
