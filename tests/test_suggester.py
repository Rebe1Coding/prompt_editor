from langchain_core.messages import AIMessage

from app.suggester import ArticleSuggester


class FakeSettings:
    def __init__(self, query_prompt_path, relevance_prompt_path):
        self.api_key = "test-key"
        self.base_url = "http://localhost/api/v1"
        self.model = "test/model"
        self.temperature = 0.0
        self.search_query_prompt_path = str(query_prompt_path)
        self.relevance_prompt_path = str(relevance_prompt_path)
        self.search_min_score = 0.5


class FakeLLM:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def invoke(self, messages):
        self.calls.append(messages)
        return AIMessage(content=self.responses.pop(0))


class FakeSearcher:
    def __init__(self, results):
        self.results = results
        self.query = None

    def search(self, query):
        self.query = query
        return self.results


def _article(title, url, score):
    return {"title": title, "url": url, "content": f"о {title}", "score": score}


def _suggester(tmp_path, searcher, responses):
    (tmp_path / "query.md").write_text("СОСТАВЬ ЗАПРОС", encoding="utf-8")
    (tmp_path / "relevance.md").write_text("ОТБЕРИ", encoding="utf-8")
    settings = FakeSettings(tmp_path / "query.md", tmp_path / "relevance.md")
    suggester = ArticleSuggester(settings, searcher)
    suggester.llm = FakeLLM(responses)
    return suggester


def test_suggest_keeps_only_relevant(tmp_path):
    searcher = FakeSearcher(
        [
            _article("Статья один", "https://a", 0.9),
            _article("Статья два", "https://b", 0.8),
        ]
    )
    suggester = _suggester(tmp_path, searcher, ["python query", "2"])
    block = suggester.suggest("отредактированный промпт")
    assert searcher.query == "python query"
    lines = block.splitlines()
    assert lines[0] == "## Может пригодиться"
    assert "- [Статья два](https://b)" in lines
    assert "- [Статья один](https://a)" not in lines


def test_query_built_from_edited_prompt(tmp_path):
    suggester = _suggester(tmp_path, FakeSearcher([]), ["запрос"])
    suggester.suggest("отредактированный промпт")
    kinds = [type(m).__name__ for m in suggester.llm.calls[0]]
    assert kinds == ["SystemMessage", "HumanMessage"]
    assert suggester.llm.calls[0][1].content == "отредактированный промпт"


def test_low_score_articles_dropped_before_relevance(tmp_path):
    searcher = FakeSearcher([_article("Слабая", "https://x", 0.2)])
    suggester = _suggester(tmp_path, searcher, ["запрос"])
    assert suggester.suggest("промпт") is None
    # отбор релевантности не вызывался: остался только запрос
    assert len(suggester.llm.calls) == 1


def test_none_when_relevance_picks_nothing(tmp_path):
    searcher = FakeSearcher([_article("Статья", "https://a", 0.9)])
    suggester = _suggester(tmp_path, searcher, ["запрос", "нет"])
    assert suggester.suggest("промпт") is None


def test_none_when_no_articles(tmp_path):
    suggester = _suggester(tmp_path, FakeSearcher([]), ["запрос"])
    assert suggester.suggest("промпт") is None
