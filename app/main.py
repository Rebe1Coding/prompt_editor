from fastapi import FastAPI, HTTPException
import uvicorn

from app.config import Settings
from app.db import SessionRepository
from app.llm import PromptEditorService
from app.schemas import EditRequest, RefineRequest
from app.storage import ResultStorage

settings = Settings()
repository = SessionRepository(settings.db_path)
editor = PromptEditorService(settings)
storage = ResultStorage(settings.results_dir)

app = FastAPI(title="Prompt Editor")


def _get_session_or_404(session_id):
    session = repository.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    return session


def _call_llm(action):
    try:
        return action()
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Ошибка LLM-провайдера: {error}")


@app.post("/api/prompts")
def create_edit(request: EditRequest):
    result = _call_llm(lambda: editor.edit(request.prompt))
    session_id = repository.create_session(request.prompt)
    repository.add_revision(session_id, None, result)
    return {"session_id": session_id, "edited_prompt": result}


@app.post("/api/prompts/{session_id}/regenerate")
def regenerate(session_id: int):
    session = _get_session_or_404(session_id)
    revisions = repository.get_revisions(session_id)
    result = _call_llm(
        lambda: editor.regenerate(session["source_prompt"], revisions)
    )
    repository.add_revision(session_id, None, result)
    return {"session_id": session_id, "edited_prompt": result}


@app.post("/api/prompts/{session_id}/refine")
def refine(session_id: int, request: RefineRequest):
    session = _get_session_or_404(session_id)
    revisions = repository.get_revisions(session_id)
    result = _call_llm(
        lambda: editor.refine(session["source_prompt"], revisions, request.instruction)
    )
    repository.add_revision(session_id, request.instruction, result)
    return {"session_id": session_id, "edited_prompt": result}


@app.post("/api/prompts/{session_id}/finalize")
def finalize(session_id: int):
    session = _get_session_or_404(session_id)
    last = repository.last_revision(session_id)
    if last is None:
        raise HTTPException(status_code=409, detail="Нет версии для сохранения")
    if session["final_file"]:
        storage.delete(session["final_file"])
    file_path = storage.save(session_id, last["result"])
    repository.set_final_file(session_id, file_path)
    return {"session_id": session_id, "file": file_path}


@app.get("/api/prompts")
def list_sessions():
    return repository.list_sessions()


@app.get("/api/prompts/{session_id}")
def get_session(session_id: int):
    session = _get_session_or_404(session_id)
    session["revisions"] = repository.get_revisions(session_id)
    return session


if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port)
