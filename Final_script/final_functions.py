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
                                                        model_path: str = None,
                                                        df_path: str = None,
                                                        top_k: int = 3) -> Dict[str, Any]:
        """
        Given a user profile dict, return top_k most similar astronauts and role similarity scores.
        Returns a dict with keys: 'top_astronauts', 'role_scores'.
        """
        import os
        
        # Set default paths relative to current file location
        if model_path is None:
            model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "word2vec_people_categories.model")
        if df_path is None:
            df_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Data Analysis", "astronauts_with_roles.pkl")
        
        # Load model and data with comprehensive logging
        print(f'\n🤖 === ASTRONAUT MATCHING ALGORITHM START ===')
        print(f'📁 Loading Word2Vec model from: {model_path}')
        model = Word2Vec.load(model_path)
        print(f'✅ Model loaded successfully: {model.vector_size} dimensions')
        
        print(f'📁 Loading astronaut data from: {df_path}')
        df = pd.read_pickle(df_path)
        print(f'✅ Astronaut data loaded: {len(df)} records')
        print(f'📊 Data columns: {list(df.columns)}')
        
        # Embed user
        print(f'\n👤 Processing user profile:')
        print(f'   Name: {user_profile.get("name", "N/A")}')
        print(f'   Nationality: {user_profile.get("nationality", "N/A")}')
        print(f'   Education: {user_profile.get("education", [])}')
        print(f'   Occupations: {user_profile.get("occupations", [])}')
        print(f'   Interests: {user_profile.get("interests", [])}')
        
        print(f'🔄 Creating user embedding...')
        user_emb = embed_person(model, user_profile)
        print(f'✅ User embedding created: shape={user_emb.shape}, non-zero elements={np.count_nonzero(user_emb)}')
        
        # Role similarity
        print(f'\n🎯 Calculating role similarities...')
        role_groups = df.groupby("roles")
        role_corr = {}
        print(f'   Available roles: {list(role_groups.groups.keys())}')
        for role, group in role_groups:
                role_embs = np.vstack(group["embedding_concat"].values)
                sims = cosine_similarity(user_emb.reshape(1, -1), role_embs).ravel()
                role_score = float(np.mean(sims)) if len(sims) > 0 else 0.0
                role_corr[role] = role_score
                print(f'   {role}: {role_score:.3f} (from {len(group)} astronauts)')
                role_corr = {role: round(score, 2) for role, score in role_corr.items()}

        # Astronaut similarity
        print(f'\n🚀 Calculating individual astronaut similarities...')
        astro_mat = np.vstack(df["embedding_concat"].values)
        print(f'📊 Astronaut matrix shape: {astro_mat.shape}')
        sims = cosine_similarity(user_emb.reshape(1, -1), astro_mat).ravel()
        print(f'📊 Similarity scores calculated: {len(sims)} scores')
        print(f'   Max similarity: {np.max(sims):.4f}')
        print(f'   Min similarity: {np.min(sims):.4f}')
        print(f'   Mean similarity: {np.mean(sims):.4f}')
        
        # Get unique astronauts by name to avoid duplicates
        print(f'\n🔍 Filtering for unique astronauts...')
        seen_names = set()
        top_astronauts = []
        
        # Sort by similarity score (descending) and get unique astronauts
        sorted_indices = np.argsort(-sims)
        print(f'📊 Top 10 similarity scores: {sims[sorted_indices[:10]]}')
        
        astronauts_checked = 0
        for idx in sorted_indices:
                astronauts_checked += 1
                if len(top_astronauts) >= top_k:
                        break
                        
                astro = df.iloc[idx].to_dict()
                # Fix: Use 'name' field which exists in the data, not 'Profile.Name'
                astro_name = astro.get('name', '')
                
                if astronauts_checked <= 5:  # Debug first 5
                    print(f'   Checking astronaut {astronauts_checked}: "{astro_name}" (similarity: {sims[idx]:.4f})')
                
                # Skip if we've already seen this astronaut or if name is empty
                if astro_name in seen_names:
                    if astronauts_checked <= 5:
                        print(f'     SKIPPED: Already seen this astronaut')
                    continue
                elif not astro_name.strip():
                    if astronauts_checked <= 5:
                        print(f'     SKIPPED: Empty astronaut name')
                    continue
                        
                seen_names.add(astro_name)
                astro["similarity"] = float(sims[idx])
                astro = {k: v for k, v in astro.items() if k != "embedding_concat"}
                top_astronauts.append(astro)
                if astronauts_checked <= 5:
                    print(f'     ADDED: "{astro_name}" to results')
        
        # If we don't have enough unique astronauts, fill with remaining unique ones
        if len(top_astronauts) < top_k:
                for idx in sorted_indices:
                        if len(top_astronauts) >= top_k:
                                break
                                
                        astro = df.iloc[idx].to_dict()
                        astro_name = astro.get('Profile.Name', '')
                        
                        # Skip if we've already seen this astronaut or if name is empty
                        if astro_name in seen_names or not astro_name.strip():
                                continue
                                
                        seen_names.add(astro_name)
                        astro["similarity"] = float(sims[idx])
                        # Keep 'name' field and add 'Profile.Name' for compatibility with frontend
                        astro['Profile.Name'] = astro_name
                        astro = {k: v for k, v in astro.items() if k != "embedding_concat"}
                        top_astronauts.append(astro)
        
        print(f'\n🎆 MATCHING COMPLETE!')
        print(f'   Total astronauts checked: {astronauts_checked}')
        print(f'   Unique astronauts found: {len(top_astronauts)}')
        print(f'   Requested top_k: {top_k}')
        
        if top_astronauts:
            print(f'\n🏆 TOP MATCHES:')
            for i, astronaut in enumerate(top_astronauts, 1):
                name = astronaut.get('Profile.Name', 'Unknown')
                similarity = astronaut.get('similarity', 0)
                print(f'   {i}. {name} (similarity: {similarity:.4f})')
        else:
            print(f'\n❌ NO MATCHES FOUND! This indicates a data or algorithm issue.')
            print(f'   Check if embedding_concat column exists and has valid data.')
        
        print(f'\n🤖 === ASTRONAUT MATCHING ALGORITHM END ===\n')
        return {"top_astronauts": top_astronauts, "role_scores": role_corr}

# print(find_similar_astronauts(
#       {
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