from datetime import datetime
from pathlib import Path


class ResultStorage:
    def __init__(self, results_dir):
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def save(self, session_id, text):
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = self.results_dir / f"prompt_{session_id}_{stamp}.md"
        path.write_text(text, encoding="utf-8")
        return str(path)

    def delete(self, file_path):
        Path(file_path).unlink(missing_ok=True)
