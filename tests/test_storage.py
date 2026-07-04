import os

from app.storage import ResultStorage


def test_save_creates_file_with_content(tmp_path):
    storage = ResultStorage(str(tmp_path / "results"))
    path = storage.save(7, "финальный промпт")
    assert os.path.exists(path)
    assert "prompt_7_" in os.path.basename(path)
    with open(path, encoding="utf-8") as f:
        assert f.read() == "финальный промпт"


def test_delete_removes_file(tmp_path):
    storage = ResultStorage(str(tmp_path / "results"))
    path = storage.save(1, "текст")
    storage.delete(path)
    assert not os.path.exists(path)


def test_delete_missing_file_no_error(tmp_path):
    storage = ResultStorage(str(tmp_path / "results"))
    storage.delete(str(tmp_path / "results" / "nope.md"))
