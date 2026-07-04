from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


class PromptEditorService:
    def __init__(self, settings):
        self.system_prompt_path = Path(settings.system_prompt_path)
        self.llm = ChatOpenAI(
            api_key=settings.api_key,
            base_url=settings.base_url,
            model=settings.model,
            temperature=settings.temperature,
        )

    def edit(self, source_prompt):
        return self._invoke(self._history(source_prompt, []))

    def refine(self, source_prompt, revisions, instruction):
        messages = self._history(source_prompt, revisions)
        messages.append(HumanMessage(content=instruction))
        return self._invoke(messages)

    def regenerate(self, source_prompt, revisions):
        messages = self._history(source_prompt, revisions)
        if isinstance(messages[-1], AIMessage):
            messages.pop()
        return self._invoke(messages)

    def _invoke(self, messages):
        return self.llm.invoke(messages).content

    def _system_message(self):
        # файл читается на каждый запрос, чтобы ручные правки применялись без рестарта
        return SystemMessage(content=self.system_prompt_path.read_text(encoding="utf-8"))

    def _history(self, source_prompt, revisions):
        messages = [self._system_message(), HumanMessage(content=source_prompt)]
        for revision in revisions:
            if revision["instruction"] is not None:
                messages.append(HumanMessage(content=revision["instruction"]))
            elif isinstance(messages[-1], AIMessage):
                # регенерация: новый вариант заменяет предыдущий ответ в истории
                messages.pop()
            messages.append(AIMessage(content=revision["result"]))
        return messages
