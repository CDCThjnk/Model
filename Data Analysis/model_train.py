import json
from pathlib import Path
from typing import List, Dict
import numpy as np
import pandas as pd
from gensim.models import Word2Vec
from sklearn.metrics.pairwise import cosine_similarity

# -------------------------
# Helpers
# -------------------------
def phrase_token(s: str) -> str:
    """Make a single token from a phrase (lowercase, spaces->underscores)."""
    return "_".join(s.strip().lower().split())

def extract_category_tokens(rec: Dict) -> Dict[str, List[str]]:
    """Extract tokens for the four categories from a single record."""
    # Education: take institution names
    edu_tokens = []
    for e in rec.get("education", []) or []:
        inst = e.get("institution")
        if inst:
            edu_tokens.append(phrase_token(inst))

    # Occupations
    occ_tokens = [phrase_token(o) for o in (rec.get("occupations") or []) if isinstance(o, str) and o.strip()]

    # Interests (might be empty)
    int_tokens = [phrase_token(i) for i in (rec.get("interests") or []) if isinstance(i, str) and i.strip()]

    # Nationality (string to single token)
    nat = rec.get("nationality")
    nat_tokens = [phrase_token(nat)] if isinstance(nat, str) and nat.strip() else []

    return {
        "education": edu_tokens,
        "occupation": occ_tokens,
        "interest": int_tokens,
        "nationality": nat_tokens,
    }

def record_to_sentence(rec: Dict) -> List[str]:
    """
    Convert one record into a 'sentence' of tokens for Word2Vec training.
    We keep each item as a single token to preserve phrases.
    """
    cats = extract_category_tokens(rec)
    # Concatenate category tokens; Word2Vec sees one list of tokens per record
    return cats["education"] + cats["occupation"] + cats["interest"] + cats["nationality"]

def mean_vector(model: Word2Vec, tokens: List[str]) -> np.ndarray:
    vecs = [model.wv[t] for t in tokens if t in model.wv]
    if not vecs:
        # if no tokens present (e.g., empty interests), return zeros
        return np.zeros(model.vector_size, dtype=np.float32)
    return np.mean(vecs, axis=0)

# -------------------------
# Load data (JSONL)
# -------------------------
jsonl_path = Path("../astronauts_structured_fixed.jsonl")

sentences: List[List[str]] = []
records: List[Dict] = []

with open(r'C:\Users\ltkie\OneDrive\Documents\UNC\Fall25\CDC25\Model\astronauts_structured_fixed.jsonl', "r", encoding="utf-8") as f:
    for line in f:
        if not line.strip():
            continue
        rec = json.loads(line)
        records.append(rec)
        sentences.append(record_to_sentence(rec))

# If you only have a single line (like the one you pasted), this still works—min_count=1 ensures training.
# -------------------------
# Train Word2Vec
# -------------------------
model = Word2Vec(
    sentences=sentences,
    vector_size=100,   # size of the embedding
    window=5,
    min_count=1,       # include rare tokens (useful for small datasets)
    workers=4,
    sg=1,              # skip-gram (often better for small corpora / rare words)
    epochs=200
)

# -------------------------
# Build per-person embeddings by category and a concatenated feature
# -------------------------
rows = []
for rec in records:
    cats = extract_category_tokens(rec)
    v_edu = mean_vector(model, cats["education"])
    v_occ = mean_vector(model, cats["occupation"])
    v_int = mean_vector(model, cats["interest"])
    v_nat = mean_vector(model, cats["nationality"])

    # Concatenate the four category vectors into one feature vector
    v_concat = np.concatenate([v_edu, v_occ, v_int, v_nat], axis=0)

    rows.append({
        "name": rec.get("name"),
        "education_tokens": cats["education"],
        "occupation_tokens": cats["occupation"],
        "interest_tokens": cats["interest"],
        "nationality_tokens": cats["nationality"],
        "embedding_concat": v_concat,       # shape: 4 * vector_size
    })

# Example: inspect the single provided record
df = pd.DataFrame(rows)


# ---------- Example user profile (replace later with real user data) ----------
user_profile = {
    "name": "Harjyot",
    "education": [{"institution": "UC Berkeley"}],
    "occupations": ["computer scientist", "Engineer"],
    "interests": ["Aviation", "STEM Education", "Mechanical Engineering"],
    "nationality": "United States"
}

def embed_person(model: Word2Vec, rec: Dict, cat_weights=None) -> np.ndarray:
    """Return concatenated (weighted) category embedding."""
    if cat_weights is None:
        cat_weights = {"education":1.0, "occupation":1.0, "interest":0.5, "nationality":0.7}

    cats = extract_category_tokens(rec)
    v_edu = mean_vector(model, cats["education"]) * cat_weights["education"]
    v_occ = mean_vector(model, cats["occupation"]) * cat_weights["occupation"]
    v_int = mean_vector(model, cats["interest"]) * cat_weights["interest"]
    v_nat = mean_vector(model, cats["nationality"]) * cat_weights["nationality"]
    return np.concatenate([v_edu, v_occ, v_int, v_nat], axis=0)

user_emb = embed_person(model, user_profile)

# ---------- Similarity computation ----------
astro_mat = np.vstack(df["embedding_concat"].values)  # (N, 4*vector_size)
user_mat = user_emb.reshape(1, -1)                               # (1, 4*vector_size)
sims = cosine_similarity(user_mat, astro_mat).ravel()            # (N,)

top_k = 3
rank_idx = np.argsort(-sims)[:top_k]

print("Top similar astronauts:")
for rank, idx in enumerate(rank_idx, 1):
    print(f"{rank}. {df.iloc[idx]}: similarity={sims[idx]:.3f}")