import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_prompt TEXT NOT NULL,
    final_file TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    instruction TEXT,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def _now():
    return datetime.now(timezone.utc).isoformat()


class SessionRepository:
    def __init__(self, db_path):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def create_session(self, source_prompt):
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO sessions (source_prompt, created_at) VALUES (?, ?)",
                (source_prompt, _now()),
            )
            return cursor.lastrowid

    def get_session(self, session_id):
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
            return dict(row) if row else None

    def list_sessions(self):
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM sessions ORDER BY id DESC"
            ).fetchall()
            return [dict(row) for row in rows]

    def add_revision(self, session_id, instruction, result):
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO revisions (session_id, instruction, result, created_at)"
                " VALUES (?, ?, ?, ?)",
                (session_id, instruction, result, _now()),
            )

    def get_revisions(self, session_id):
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM revisions WHERE session_id = ? ORDER BY id",
                (session_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def last_revision(self, session_id):
        revisions = self.get_revisions(session_id)
        return revisions[-1] if revisions else None

    def delete_session(self, session_id):
        with self._connect() as conn:
            conn.execute("DELETE FROM revisions WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

    def set_final_file(self, session_id, file_path):
        with self._connect() as conn:
            conn.execute(
                "UPDATE sessions SET final_file = ? WHERE id = ?",
                (file_path, session_id),
            )
