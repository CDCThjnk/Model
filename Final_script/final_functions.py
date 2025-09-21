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


import numpy as np
import pandas as pd
from gensim.models import Word2Vec
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Any

# Helper functions (copied from models_test)
def phrase_token(s: str) -> str:
	return "_".join(s.strip().lower().split())

def extract_category_tokens(rec: Dict) -> Dict[str, List[str]]:
	edu_tokens = []
	for e in rec.get("education", []) or []:
		inst = e.get("institution")
		if inst:
			edu_tokens.append(phrase_token(inst))
	occ_tokens = [phrase_token(o) for o in (rec.get("occupations") or []) if isinstance(o, str) and o.strip()]
	int_tokens = [phrase_token(i) for i in (rec.get("interests") or []) if isinstance(i, str) and i.strip()]
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

def find_similar_astronauts(user_profile: Dict[str, Any],
							model_path: str = r"/Users/harjyot/Desktop/code/Model/word2vec_people_categories.model",
							df_path: str = r"/Users/harjyot/Desktop/code/Model/Data Analysis/astronauts_with_roles.pkl",
							top_k: int = 3) -> Dict[str, Any]:
	"""
	Given a user profile dict, return top_k most similar astronauts and role similarity scores.
	Returns a dict with keys: 'top_astronauts', 'role_scores'.
	"""
	# Load model and data
	model = Word2Vec.load(model_path)
	df = pd.read_pickle(df_path)
	# Embed user
	user_emb = embed_person(model, user_profile)
	
	# Role similarity
	role_groups = df.groupby("roles")
	role_corr = {}
	for role, group in role_groups:
		role_embs = np.vstack(group["embedding_concat"].values)
		sims = cosine_similarity(user_emb.reshape(1, -1), role_embs).ravel()
		role_corr[role] = float(np.mean(sims)) if len(sims) > 0 else 0.0
		role_corr = {role: round(score, 2) for role, score in role_corr.items()}

	# Astronaut similarity
	astro_mat = np.vstack(df["embedding_concat"].values)
	sims = cosine_similarity(user_emb.reshape(1, -1), astro_mat).ravel()
	rank_idx = np.argsort(-sims)[:top_k]
	top_astronauts = []
	for idx in rank_idx:
		astro = df.iloc[idx].to_dict()
		astro["similarity"] = float(sims[idx])
		astro = {k: v for k, v in astro.items() if k != "embedding_concat"}
		top_astronauts.append(astro)
	return {"top_astronauts": top_astronauts, "role_scores": role_corr}

# print(find_similar_astronauts(
# 	{
#     "name": "Test Artistic Social Worker",
#     "education": [
#         {"institution": "Royal Academy of Dramatic Art"},
#         {"institution": "London School of Social Work"}
#     ],
#     "occupations": ["Actor", "Poet", "Social Worker"],
#     "interests": ["Painting", "Writing Poetry", "Theatre", "Community Volunteering"],
#     "nationality": "United Kingdom"
# }
# ))