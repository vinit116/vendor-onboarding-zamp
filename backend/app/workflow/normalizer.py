import re

ABBREVIATIONS = {
    "PRIVATE": "PVT",
    "LIMITED": "LTD",
    "INCORPORATED": "INC",
    "CORPORATION": "CORP",
    "COMPANY": "CO",
}

STOP_WORDS = {"THE", "AND", "OF"}
GENERIC_ENTITY_TOKENS = {"PVT", "LTD", "INC", "CORP", "CO"}

def normalize_name(value: str) -> str:
    value = value.upper()
    for old, new in ABBREVIATIONS.items():
        value = re.sub(rf"\b{old}\b", new, value)
    value = re.sub(r"[^A-Z0-9 ]", " ", value)
    tokens = [t for t in value.split() if t not in STOP_WORDS]
    return " ".join(tokens)

def names_equivalent(left: str, right: str) -> bool:
    return normalize_name(left) == normalize_name(right)


def names_are_ambiguous(left: str, right: str) -> bool:
    """Return true only for partial deterministic overlap, not clear conflicts."""
    left_tokens = set(normalize_name(left).split()) - GENERIC_ENTITY_TOKENS
    right_tokens = set(normalize_name(right).split()) - GENERIC_ENTITY_TOKENS
    return bool(left_tokens and right_tokens and left_tokens.intersection(right_tokens))
