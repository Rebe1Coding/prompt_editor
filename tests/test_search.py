import app.search as search_module
from app.search import TavilySearch


def test_search_empty_without_key():
    assert TavilySearch("", 3).search("любой запрос") == []


def test_search_empty_without_query():
    assert TavilySearch("key", 3).search("") == []


def test_search_parses_title_and_url(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "results": [
                    {"title": "T", "url": "U", "content": "C"},
                ]
            }

    def fake_post(url, json, timeout):
        return FakeResponse()

    monkeypatch.setattr(search_module.httpx, "post", fake_post)
    assert TavilySearch("key", 3).search("q") == [{"title": "T", "url": "U"}]
