# ---- NumPy pickle compatibility shim (handles numeric + multiarray) ----
import sys, types, importlib

# Import modern NumPy core modules
import numpy as _np

# Helper: clone a real module into a fake name in sys.modules
def _alias_module(real_mod_name: str, fake_mod_name: str):
    try:
        real_mod = importlib.import_module(real_mod_name)
    except Exception:
        return
    fake_mod = types.ModuleType(fake_mod_name)
    fake_mod.__dict__.update(real_mod.__dict__)
    sys.modules[fake_mod_name] = fake_mod

# Provide a package-like placeholder for 'numpy._core'
if "numpy._core" not in sys.modules:
    pkg = types.ModuleType("numpy._core")
    pkg.__path__ = []  # make it package-like
    sys.modules["numpy._core"] = pkg

# Map old -> new locations
# numeric
_alias_module("numpy.core.numeric", "numpy._core.numeric")

# multiarray (NumPy >=1.16 consolidated into _multiarray_umath)
# Try both possibilities to satisfy old pickles
_alias_module("numpy.core.multiarray", "numpy._core.multiarray")
_alias_module("numpy.core._multiarray_umath", "numpy._core._multiarray_umath")
# some old objects reference 'numpy._core.umath' too — map it to the same impl
_alias_module("numpy.core._multiarray_umath", "numpy._core.umath")
# ---- end shim ----
# Code above written by ChatGPT to temporarily resolve a conflict in numpy versions on my comp

import json
from pathlib import Path
from typing import List, Dict
import numpy as np
import pandas as pd
from gensim.models import Word2Vec
from sklearn.metrics.pairwise import cosine_similarity
import joblib

# -------------------------
# Helpers
# -------------------------
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

def mean_vector(model: Word2Vec, tokens: List[str]) -> np.ndarray:
    vecs = [model.wv[t] for t in tokens if t in model.wv]
    if not vecs:
        # if no tokens present (e.g., empty interests), return zeros
        return np.zeros(model.vector_size, dtype=np.float32)
    return np.mean(vecs, axis=0)

def embed_person(model: Word2Vec, rec: Dict, cat_weights=None) -> np.ndarray:
    if cat_weights is None:
        cat_weights = {"education":1.0, "occupation":1.0, "interest":0.5, "nationality":0.7}

    cats = extract_category_tokens(rec)
    v_edu = mean_vector(model, cats["education"]) * cat_weights["education"]
    v_occ = mean_vector(model, cats["occupation"]) * cat_weights["occupation"]
    v_int = mean_vector(model, cats["interest"]) * cat_weights["interest"]
    v_nat = mean_vector(model, cats["nationality"]) * cat_weights["nationality"]
    return np.concatenate([v_edu, v_occ, v_int, v_nat], axis=0)

# ------------------------- Model -------------------------
astronaut_model = Word2Vec.load(r"../word2vec_people_categories.model")
df = pd.read_pickle(r"../Data/astronauts_with_roles.pkl")

user_profile_aviator = {
    "name": "Test Aviator",
    "education": [
        {"institution": "Gagarin Air Force Academy"},
        {"institution": "Krasnodar Higher Military Aviation School of Pilots"}
    ],
    "occupations": ["Fighter Pilot", "Commander", "Cosmonaut"],
    "interests": ["Aviation", "Military Strategy"],
    "nationality": "Russia"
}

user_profile_scientist = {
    "name": "Test Scientist",
    "education": [
        {"institution": "Massachusetts Institute of Technology"},
        {"institution": "Stanford University"}
    ],
    "occupations": ["Engineer", "Physicist", "Scientist"],
    "interests": ["Biology", "Robotics", "Education", "Dance"],
    "nationality": "United States"
}

user_profile_non_astronaut = {
    "name": "Test Artistic Social Worker",
    "education": [
        {"institution": "Royal Academy of Dramatic Art"},
        {"institution": "London School of Social Work"}
    ],
    "occupations": ["Actor", "Poet", "Social Worker"],
    "interests": ["Painting", "Writing Poetry", "Theatre", "Community Volunteering"],
    "nationality": "United Kingdom"
}

user_emb = embed_person(astronaut_model, user_profile_non_astronaut)

# ---------- Calculate similarity profile for each role ----------
# Group astronauts by their roles
role_groups = df.groupby("roles")

# Calculate average cross-correlation (cosine similarity) for each role
role_corr = {}
for role, group in role_groups:
    role_embs = np.vstack(group["embedding_concat"].values)
    sims = cosine_similarity(user_emb.reshape(1, -1), role_embs).ravel()
    role_corr[role] = np.mean(sims) if len(sims) > 0 else 0.0

# Output cross-correlation values for each role
print("Average cross-correlation (cosine similarity) for each role:")
for role, avg_corr in role_corr.items():
    print(f"{role}: {avg_corr:.3f}")

# ---------- Similarity computation ----------
astro_mat = np.vstack(df["embedding_concat"].values)  
user_mat = user_emb.reshape(1, -1)                             
sims = cosine_similarity(user_mat, astro_mat).ravel()            

top_k = 3
rank_idx = np.argsort(-sims)[:top_k]

print("Top similar astronauts:")
for rank, idx in enumerate(rank_idx, 1):
    print(f"{rank}. {df.iloc[idx]}: similarity={sims[idx]:.3f}")