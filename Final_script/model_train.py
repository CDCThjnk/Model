import json
from pathlib import Path
from typing import List, Dict
import numpy as np
import pandas as pd
from gensim.models import Word2Vec
from sklearn.metrics.pairwise import cosine_similarity


# Helpers
def phrase_token(s: str) -> str:
    return "_".join(s.strip().lower().split())

def extract_category_tokens(rec: Dict) -> Dict[str, List[str]]:
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
    cats = extract_category_tokens(rec)
    return cats["education"] + cats["occupation"] + cats["interest"] + cats["nationality"]

def mean_vector(model: Word2Vec, tokens: List[str]) -> np.ndarray:
    vecs = [model.wv[t] for t in tokens if t in model.wv]
    if not vecs:
        return np.zeros(model.vector_size, dtype=np.float32)
    return np.mean(vecs, axis=0)


# Load training data data
jsonl_path = Path("../astronauts_structured_fixed.jsonl")
jsonl_non_astronauts_path = Path("../non_astronauts_600.jsonl")

sentences: List[List[str]] = []
records: List[Dict] = []

with open(jsonl_path, "r", encoding="utf-8") as f:
    for line in f:
        if not line.strip():
            continue
        rec = json.loads(line)
        records.append(rec)
        sentences.append(record_to_sentence(rec))

with open(jsonl_non_astronauts_path, "r", encoding="utf-8") as f:
    for line in f:
        if not line.strip():
            continue
        rec = json.loads(line)
        records.append(rec)
        sentences.append(record_to_sentence(rec))

# -------------------------
# Train Model
model = Word2Vec(
    sentences=sentences,
    vector_size=100,
    window=5,
    min_count=1,      
    workers=4,
    sg=1,             
    epochs=200
)

model.save("word2vec_people_categories.model")

# ------------------------- Astronaut vectors' table -------------------------
# Build per-person embeddings by category and a concatenated feature
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
synthetic = [0]*535
synthetic += [1]*(len(df)-535)
df["synthetic"] = synthetic
df.to_pickle("astronauts_embeddings.pkl")