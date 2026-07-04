from app.db import SessionRepository


def _repo(tmp_path):
    return SessionRepository(str(tmp_path / "db.sqlite"))


def test_create_and_get_session(tmp_path):
    repo = _repo(tmp_path)
    session_id = repo.create_session("исходник")
    session = repo.get_session(session_id)
    assert session["source_prompt"] == "исходник"
    assert session["final_file"] is None


def test_get_missing_session_returns_none(tmp_path):
    assert _repo(tmp_path).get_session(999) is None


def test_list_sessions_newest_first(tmp_path):
    repo = _repo(tmp_path)
    first = repo.create_session("a")
    second = repo.create_session("b")
    assert [s["id"] for s in repo.list_sessions()] == [second, first]


def test_revisions_order_and_last(tmp_path):
    repo = _repo(tmp_path)
    session_id = repo.create_session("исходник")
    repo.add_revision(session_id, None, "первый")
    repo.add_revision(session_id, "правка", "второй")
    revisions = repo.get_revisions(session_id)
    assert [r["result"] for r in revisions] == ["первый", "второй"]
    assert repo.last_revision(session_id)["result"] == "второй"


def test_last_revision_none_when_empty(tmp_path):
    repo = _repo(tmp_path)
    session_id = repo.create_session("исходник")
    assert repo.last_revision(session_id) is None


def test_set_final_file(tmp_path):
    repo = _repo(tmp_path)
    session_id = repo.create_session("исходник")
    repo.set_final_file(session_id, "path/to.md")
    assert repo.get_session(session_id)["final_file"] == "path/to.md"


def test_delete_session_removes_revisions(tmp_path):
    repo = _repo(tmp_path)
    session_id = repo.create_session("исходник")
    repo.add_revision(session_id, None, "текст")
    repo.delete_session(session_id)
    assert repo.get_session(session_id) is None
    assert repo.get_revisions(session_id) == []
