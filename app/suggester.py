import re
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

SUGGESTIONS_HEADING = "Может пригодиться"


class ArticleSuggester:
    def __init__(self, settings, searcher):
        self.query_prompt_path = Path(settings.search_query_prompt_path)
        self.relevance_prompt_path = Path(settings.relevance_prompt_path)
        self.min_score = settings.search_min_score
        self.searcher = searcher
        self.llm = ChatOpenAI(
            api_key=settings.api_key,
            base_url=settings.base_url,
            model=settings.model,
            temperature=settings.temperature,
        )

    def suggest(self, edited_prompt):
        query = self._search_query(edited_prompt)
        articles = [a for a in self.searcher.search(query) if a["score"] >= self.min_score]
        if not articles:
            return None
        relevant = self._keep_relevant(edited_prompt, articles)
        if not relevant:
            return None
        return self._format(relevant)

    def _search_query(self, edited_prompt):
        messages = [
            SystemMessage(content=self.query_prompt_path.read_text(encoding="utf-8")),
            HumanMessage(content=edited_prompt),
        ]
        return self.llm.invoke(messages).content.strip()

    def _keep_relevant(self, edited_prompt, articles):
        request = f"Задача:\n{edited_prompt}\n\nСтатьи:\n{self._catalog(articles)}"
        messages = [
            SystemMessage(content=self.relevance_prompt_path.read_text(encoding="utf-8")),
            HumanMessage(content=request),
        ]
        answer = self.llm.invoke(messages).content
        return [articles[i] for i in self._picked_indices(answer, len(articles))]

    def _catalog(self, articles):
        lines = []
        for number, article in enumerate(articles, start=1):
            lines.append(f"{number}. {article['title']}\n{article['content']}")
        return "\n\n".join(lines)

    def _picked_indices(self, answer, count):
        indices = []
        for token in re.findall(r"\d+", answer):
            index = int(token) - 1
            if 0 <= index < count and index not in indices:
                indices.append(index)
        return indices

    def _format(self, articles):
        lines = [f"## {SUGGESTIONS_HEADING}", ""]
        for article in articles:
            lines.append(f"- [{article['title']}]({article['url']})")
        return "\n".join(lines)
