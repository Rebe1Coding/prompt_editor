from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.llm import PromptEditorService


class FakeSettings:
    def __init__(self, system_prompt_path):
        self.api_key = "test-key"
        self.base_url = "http://localhost/api/v1"
        self.model = "test/model"
        self.temperature = 0.0
        self.system_prompt_path = str(system_prompt_path)


def _service(tmp_path):
    sp = tmp_path / "system.md"
    sp.write_text("СИСТЕМНЫЙ", encoding="utf-8")
    return PromptEditorService(FakeSettings(sp))


def test_messages_for_edit(tmp_path):
    service = _service(tmp_path)
    messages = service.messages_for_edit("исходник")
    assert isinstance(messages[0], SystemMessage)
    assert messages[0].content == "СИСТЕМНЫЙ"
    assert isinstance(messages[1], HumanMessage)
    assert messages[1].content == "исходник"
    assert len(messages) == 2


def test_refine_appends_history_and_instruction(tmp_path):
    service = _service(tmp_path)
    revisions = [
        {"instruction": None, "result": "первый вариант"},
        {"instruction": "короче", "result": "второй вариант"},
    ]
    messages = service.messages_for_refine("исходник", revisions, "ещё короче")
    kinds = [type(m).__name__ for m in messages]
    assert kinds == [
        "SystemMessage",
        "HumanMessage",
        "AIMessage",
        "HumanMessage",
        "AIMessage",
        "HumanMessage",
    ]
    assert messages[-1].content == "ещё короче"
    assert messages[2].content == "первый вариант"


def test_regenerate_replaces_last_answer(tmp_path):
    service = _service(tmp_path)
    revisions = [
        {"instruction": None, "result": "первый вариант"},
        {"instruction": None, "result": "перегенерированный"},
    ]
    messages = service.messages_for_regenerate("исходник", revisions)
    # обе ревизии без инструкции — в истории остаётся один ответ, а он снят перед новым вызовом
    assert [type(m).__name__ for m in messages] == ["SystemMessage", "HumanMessage"]


def test_system_prompt_reread_each_call(tmp_path):
    service = _service(tmp_path)
    first = service.messages_for_edit("x")[0].content
    (tmp_path / "system.md").write_text("НОВЫЙ", encoding="utf-8")
    second = service.messages_for_edit("x")[0].content
    assert first == "СИСТЕМНЫЙ"
    assert second == "НОВЫЙ"
