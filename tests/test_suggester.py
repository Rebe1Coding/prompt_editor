from langchain_core.messages import AIMessage

from app.suggester import ArticleSuggester


class FakeSettings:
    def __init__(self, query_prompt_path):
        self.api_key = "test-key"
        self.base_url = "http://localhost/api/v1"
        self.model = "test/model"
        self.temperature = 0.0
        self.search_query_prompt_path = str(query_prompt_path)


class FakeLLM:
    def __init__(self, query):
        self.query = query
        self.seen = None

    def invoke(self, messages):
        self.seen = messages
        return AIMessage(content=self.query)


class FakeSearcher:
    def __init__(self, results):
        self.results = results
        self.query = None

    def search(self, query):
        self.query = query
        return self.results


def _suggester(tmp_path, searcher, query):
    qp = tmp_path / "query.md"
    qp.write_text("СОСТАВЬ ЗАПРОС", encoding="utf-8")
    suggester = ArticleSuggester(FakeSettings(qp), searcher)
    suggester.llm = FakeLLM(query)
    return suggester


def test_suggest_formats_links(tmp_path):
    searcher = FakeSearcher(
        [
            {"title": "Статья один", "url": "https://a"},
            {"title": "Статья два", "url": "https://b"},
        ]
    )
    suggester = _suggester(tmp_path, searcher, "асинхронность python")
    block = suggester.suggest("отредактированный промпт")
    assert searcher.query == "асинхронность python"
    lines = block.splitlines()
    assert lines[0] == "## Может пригодиться"
    assert "- [Статья один](https://a)" in lines
    assert "- [Статья два](https://b)" in lines


def test_query_built_from_edited_prompt(tmp_path):
    suggester = _suggester(tmp_path, FakeSearcher([]), "запрос")
    suggester.suggest("отредактированный промпт")
    kinds = [type(m).__name__ for m in suggester.llm.seen]
    assert kinds == ["SystemMessage", "HumanMessage"]
    assert suggester.llm.seen[1].content == "отредактированный промпт"


def test_suggest_none_when_no_articles(tmp_path):
    suggester = _suggester(tmp_path, FakeSearcher([]), "запрос")
    assert suggester.suggest("промпт") is None
