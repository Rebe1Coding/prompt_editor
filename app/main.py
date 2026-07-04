import json

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import uvicorn

from app.config import Settings
from app.db import SessionRepository
from app.llm import PromptEditorService
from app.schemas import EditRequest, RefineRequest
from app.storage import ResultStorage

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def _sse(payload):
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _streaming_response(generator):
    return StreamingResponse(
        generator, media_type="text/event-stream", headers=SSE_HEADERS
    )


def create_app(repository, editor, storage):
    app = FastAPI(title="Prompt Editor")

    def get_session_or_404(session_id):
        session = repository.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        return session

    def stream(session_id, messages, instruction, emit_session, drop_session_on_error):
        if emit_session:
            yield _sse({"type": "session", "session_id": session_id})
        parts = []
        try:
            for token in editor.stream(messages):
                parts.append(token)
                yield _sse({"type": "token", "text": token})
        except Exception as error:
            if drop_session_on_error:
                repository.delete_session(session_id)
            yield _sse({"type": "error", "detail": str(error)})
            return
        repository.add_revision(session_id, instruction, "".join(parts))
        yield _sse({"type": "done"})

    @app.post("/api/prompts")
    def create_edit(request: EditRequest):
        session_id = repository.create_session(request.prompt)
        messages = editor.messages_for_edit(request.prompt)
        return _streaming_response(
            stream(session_id, messages, None, True, True)
        )

    @app.post("/api/prompts/{session_id}/regenerate")
    def regenerate(session_id: int):
        session = get_session_or_404(session_id)
        revisions = repository.get_revisions(session_id)
        messages = editor.messages_for_regenerate(session["source_prompt"], revisions)
        return _streaming_response(
            stream(session_id, messages, None, False, False)
        )

    @app.post("/api/prompts/{session_id}/refine")
    def refine(session_id: int, request: RefineRequest):
        session = get_session_or_404(session_id)
        revisions = repository.get_revisions(session_id)
        messages = editor.messages_for_refine(
            session["source_prompt"], revisions, request.instruction
        )
        return _streaming_response(
            stream(session_id, messages, request.instruction, False, False)
        )

    @app.post("/api/prompts/{session_id}/finalize")
    def finalize(session_id: int):
        session = get_session_or_404(session_id)
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
        session = get_session_or_404(session_id)
        session["revisions"] = repository.get_revisions(session_id)
        return session

    return app


def build_default_app():
    settings = Settings()
    repository = SessionRepository(settings.db_path)
    editor = PromptEditorService(settings)
    storage = ResultStorage(settings.results_dir)
    return settings, create_app(repository, editor, storage)


settings, app = build_default_app()


if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port)
