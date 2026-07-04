from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

SUGGESTIONS_HEADING = "Может пригодиться"


class ArticleSuggester:
    def __init__(self, settings, searcher):
        self.query_prompt_path = Path(settings.search_query_prompt_path)
        self.searcher = searcher
        self.llm = ChatOpenAI(
            api_key=settings.api_key,
            base_url=settings.base_url,
            model=settings.model,
            temperature=settings.temperature,
        )

    def suggest(self, edited_prompt):
        query = self._search_query(edited_prompt)
        articles = self.searcher.search(query)
        if not articles:
            return None
        return self._format(articles)

    def _search_query(self, edited_prompt):
        messages = [
            SystemMessage(content=self.query_prompt_path.read_text(encoding="utf-8")),
            HumanMessage(content=edited_prompt),
        ]
        return self.llm.invoke(messages).content.strip()

    def _format(self, articles):
        lines = [f"## {SUGGESTIONS_HEADING}", ""]
        for article in articles:
            lines.append(f"- [{article['title']}]({article['url']})")
        return "\n".join(lines)
