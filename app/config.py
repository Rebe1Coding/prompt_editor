import yaml


class Settings:
    def __init__(self, path="config.yaml"):
        with open(path, encoding="utf-8") as f:
            raw = yaml.safe_load(f)
        provider = raw["provider"]
        storage = raw["storage"]
        server = raw["server"]
        search = raw.get("search", {})
        self.api_key = provider["api_key"]
        self.base_url = provider["base_url"]
        self.model = provider["model"]
        self.temperature = provider.get("temperature", 0.3)
        self.tavily_api_key = search.get("tavily_api_key", "")
        self.search_max_results = search.get("max_results", 5)
        self.search_min_score = search.get("min_score", 0.4)
        self.db_path = storage["db_path"]
        self.results_dir = storage["results_dir"]
        self.system_prompt_path = storage["system_prompt_path"]
        self.search_query_prompt_path = storage.get(
            "search_query_prompt_path", "prompts/search_query_prompt.md"
        )
        self.relevance_prompt_path = storage.get(
            "relevance_prompt_path", "prompts/relevance_prompt.md"
        )
        self.host = server["host"]
        self.port = server["port"]
