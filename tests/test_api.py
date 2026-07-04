from tests.conftest import read_sse


def _stream(client, method, url, body=None):
    with client.stream(method, url, json=body) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        return read_sse(response)


def test_create_streams_tokens_and_persists(client, repo, editor):
    events = _stream(client, "POST", "/api/prompts", {"prompt": "исходник"})
    types = [e["type"] for e in events]
    assert types == ["session", "token", "token", "token", "done"]
    session_id = events[0]["session_id"]
    text = "".join(e["text"] for e in events if e["type"] == "token")
    assert text == "Исправленный промпт"
    revisions = repo.get_revisions(session_id)
    assert len(revisions) == 1
    assert revisions[0]["result"] == "Исправленный промпт"
    assert revisions[0]["instruction"] is None


def test_suggester_block_appended_and_persisted(client, repo, suggester):
    suggester.block = "## Может пригодиться\n\n- [Статья](https://a)"
    events = _stream(client, "POST", "/api/prompts", {"prompt": "исходник"})
    text = "".join(e["text"] for e in events if e["type"] == "token")
    assert text == "Исправленный промпт\n\n## Может пригодиться\n\n- [Статья](https://a)"
    # суб-агент видит именно отредактированный промпт
    assert suggester.seen_prompt == "Исправленный промпт"
    session_id = events[0]["session_id"]
    assert repo.get_revisions(session_id)[0]["result"] == text


def test_suggester_failure_does_not_break_answer(client, repo, suggester):
    suggester.error = "поиск недоступен"
    events = _stream(client, "POST", "/api/prompts", {"prompt": "исходник"})
    assert [e["type"] for e in events] == ["session", "token", "token", "token", "done"]
    session_id = events[0]["session_id"]
    assert repo.get_revisions(session_id)[0]["result"] == "Исправленный промпт"


def test_create_error_deletes_empty_session(client, repo, editor):
    editor.tokens = []
    editor.error = "нет ключа"
    events = _stream(client, "POST", "/api/prompts", {"prompt": "исходник"})
    assert events[-1]["type"] == "error"
    assert events[-1]["detail"] == "нет ключа"
    assert repo.list_sessions() == []


def test_create_missing_field_422(client):
    response = client.post("/api/prompts", json={})
    assert response.status_code == 422


def test_regenerate_missing_session_404(client):
    response = client.post("/api/prompts/999/regenerate")
    assert response.status_code == 404


def test_regenerate_adds_revision(client, repo):
    session_id = repo.create_session("исходник")
    repo.add_revision(session_id, None, "первый вариант")
    events = _stream(client, "POST", f"/api/prompts/{session_id}/regenerate")
    assert [e["type"] for e in events] == ["token", "token", "token", "done"]
    revisions = repo.get_revisions(session_id)
    assert len(revisions) == 2
    assert revisions[-1]["instruction"] is None
    assert revisions[-1]["result"] == "Исправленный промпт"


def test_refine_persists_instruction(client, repo, editor):
    session_id = repo.create_session("исходник")
    repo.add_revision(session_id, None, "первый вариант")
    events = _stream(
        client,
        "POST",
        f"/api/prompts/{session_id}/refine",
        {"instruction": "короче"},
    )
    assert events[-1]["type"] == "done"
    revisions = repo.get_revisions(session_id)
    assert revisions[-1]["instruction"] == "короче"
    # инструкция и число прошлых ревизий доходят до сервиса
    assert editor.seen_messages == [("refine", "исходник", 1, "короче")]


def test_refine_missing_session_404(client):
    response = client.post("/api/prompts/999/refine", json={"instruction": "x"})
    assert response.status_code == 404


def test_refine_missing_field_422(client, repo):
    session_id = repo.create_session("исходник")
    response = client.post(f"/api/prompts/{session_id}/refine", json={})
    assert response.status_code == 422


def test_error_on_refine_keeps_existing_revisions(client, repo, editor):
    session_id = repo.create_session("исходник")
    repo.add_revision(session_id, None, "первый вариант")
    editor.tokens = []
    editor.error = "сбой"
    events = _stream(
        client, "POST", f"/api/prompts/{session_id}/refine", {"instruction": "x"}
    )
    assert events[-1]["type"] == "error"
    assert repo.get_session(session_id) is not None
    assert len(repo.get_revisions(session_id)) == 1


def test_finalize_writes_file(client, repo):
    import os

    session_id = repo.create_session("исходник")
    repo.add_revision(session_id, None, "финальный текст")
    response = client.post(f"/api/prompts/{session_id}/finalize")
    assert response.status_code == 200
    path = response.json()["file"]
    assert os.path.exists(path)
    with open(path, encoding="utf-8") as f:
        assert f.read() == "финальный текст"
    assert repo.get_session(session_id)["final_file"] == path


def test_finalize_keeps_single_latest_file(client, repo, tmp_path, storage):
    import os

    session_id = repo.create_session("исходник")
    repo.add_revision(session_id, None, "версия один")
    client.post(f"/api/prompts/{session_id}/finalize")
    repo.add_revision(session_id, "правка", "версия два")
    second = client.post(f"/api/prompts/{session_id}/finalize").json()["file"]
    # на диске остаётся одна финальная версия с последним текстом
    files = os.listdir(storage.results_dir)
    assert len(files) == 1
    with open(second, encoding="utf-8") as f:
        assert f.read() == "версия два"
    assert repo.get_session(session_id)["final_file"] == second


def test_finalize_no_revision_409(client, repo):
    session_id = repo.create_session("исходник")
    response = client.post(f"/api/prompts/{session_id}/finalize")
    assert response.status_code == 409


def test_finalize_missing_session_404(client):
    response = client.post("/api/prompts/999/finalize")
    assert response.status_code == 404


def test_list_and_get_session(client, repo):
    first = repo.create_session("первый")
    second = repo.create_session("второй")
    repo.add_revision(second, None, "результат")
    listing = client.get("/api/prompts").json()
    assert [s["id"] for s in listing] == [second, first]
    detail = client.get(f"/api/prompts/{second}").json()
    assert detail["source_prompt"] == "второй"
    assert len(detail["revisions"]) == 1


def test_get_missing_session_404(client):
    assert client.get("/api/prompts/999").status_code == 404
