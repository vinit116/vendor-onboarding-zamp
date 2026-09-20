import pytest


@pytest.fixture(autouse=True)
def disable_real_openai_calls(monkeypatch):
    """Tests use injected fake clients; never read a developer's real API key."""
    monkeypatch.setenv("OPENAI_API_KEY", "")
