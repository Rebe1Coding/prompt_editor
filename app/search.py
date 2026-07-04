import httpx

TAVILY_URL = "https://api.tavily.com/search"


class TavilySearch:
    def __init__(self, api_key, max_results=3, timeout=10):
        self.api_key = api_key
        self.max_results = max_results
        self.timeout = timeout

    def search(self, query):
        if not self.api_key or not query:
            return []
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": self.max_results,
            "search_depth": "basic",
        }
        response = httpx.post(TAVILY_URL, json=payload, timeout=self.timeout)
        response.raise_for_status()
        results = response.json().get("results", [])
        return [{"title": item["title"], "url": item["url"]} for item in results]
