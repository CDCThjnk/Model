# server.py
from flask import Flask, request, jsonify
from final_functions import find_similar_astronauts
import traceback
import pandas as pd
import logging
from typing import List, Dict, Any

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

CSV_PATH = '/Users/harjyot/Desktop/code/Model/Data Analysis/astronauts.csv'  # adjust if needed

import re

SUFFIXES = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}

def _norm_token(s: str) -> str:
    # lower, strip spaces, remove periods and extra punctuation
    return re.sub(r"[^\w\-']", "", s.casefold()).strip()

def _split_candidate_name(full: str):
    # model: "Aleksandr Ivanchenkov" → first="aleksandr", last="ivanchenkov"
    parts = full.strip().split()
    if not parts:
        return None, None
    first = _norm_token(parts[0])
    last = _norm_token(parts[-1])
    # handle single-word names (rare)
    if last == first and len(parts) == 1:
        return first, None
    return first, last

def _split_csv_name(csv_name: str):
    # CSV: "Glenn, John H., Jr." → last="glenn", first="john"
    # CSV: "Carpenter, M. Scott" → last="carpenter", first="m"
    # CSV: "Glenn, John H., Jr." (ignore suffix)
    left, sep, right = csv_name.partition(",")
    last = _norm_token(left) if sep else _norm_token(csv_name)
    first = ""
    if sep:
        # remove suffixes and keep the *first* given name token
        right_tokens = [_norm_token(t) for t in right.strip().split()]
        right_tokens = [t for t in right_tokens if t and t not in SUFFIXES]
        first = right_tokens[0] if right_tokens else ""
    return first, last  # normalized

def get_profiles_from_names(names: List[str], csv_path: str = CSV_PATH) -> List[Dict[str, Any]]:
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    if 'Profile.Name' not in df.columns:
        raise KeyError("CSV must contain a 'Profile.Name' column")

    # Precompute normalized first/last for the CSV once
    if '___norm_first' not in df.columns or '___norm_last' not in df.columns:
        norm_first, norm_last = [], []
        for raw in df['Profile.Name'].fillna(""):
            f, l = _split_csv_name(str(raw))
            norm_first.append(f)
            norm_last.append(l)
        df['___norm_first'] = norm_first
        df['___norm_last']  = norm_last

    wanted = []
    for name in names:
        if not isinstance(name, str) or not name.strip():
            continue
        cf, cl = _split_candidate_name(name)
        if cf is None:  # empty after normalization
            continue

        # Build a mask: exact last match AND first startswith
        mask = True
        if cl:
            mask = mask & (df['___norm_last'] == cl)
        # allow first initial or prefix match (e.g., "John" vs "J." or "Johnny")
        mask = mask & (df['___norm_first'].str.startswith(cf))

        matches = df[mask]

        # If nothing with exact last name, try a looser fallback: last startswith
        if matches.empty and cl:
            mask2 = (df['___norm_last'].str.startswith(cl)) & (df['___norm_first'].str.startswith(cf))
            matches = df[mask2]

        if not matches.empty:
            wanted.append(matches)

    if not wanted:
        return []

    out = pd.concat(wanted, ignore_index=True)
    # Drop exact duplicate people if they exist
    out = out.drop_duplicates(subset=['Profile.Name'])
    return out.to_dict(orient='records')


def extract_names(items: List[Dict[str, Any]]) -> List[str]:
    names = []
    for a in items:
        # accept either 'Name' or 'name'
        n = a.get('Name') or a.get('name')
        if isinstance(n, str) and n.strip():
            names.append(n.strip())
    return names

@app.route('/similar_astronauts', methods=['POST'])
def similar_astronauts():
    try:
        data = request.get_json(silent=True) or {}
        user_profile = data.get('user_profile')
        top_k = data.get('top_k', 3)

        if not isinstance(user_profile, dict):
            return jsonify({"error": "user_profile must be a JSON object"}), 400
        try:
            top_k = int(top_k)
        except (TypeError, ValueError):
            return jsonify({"error": "top_k must be an integer"}), 400

        # Call your similarity function
        result = find_similar_astronauts(user_profile, top_k=top_k)

        # Be defensive about structure
        top_astronauts = result.get('top_astronauts', [])
        if not isinstance(top_astronauts, list):
            return jsonify({"error": "top_astronauts must be a list in the model result"}), 500

        # Extract names robustly (handles 'Name' vs 'name')
        top_names = extract_names(top_astronauts)
        if not top_names:
            # Keep the original structure so the client still gets role_scores, etc.
            result['top_astronauts'] = []
            return jsonify(result)

        # Fetch full profiles from the CSV using 'Name' column
        full_profiles = get_profiles_from_names(top_names, csv_path=CSV_PATH)
        print("Full Profiles\n\n\n:")
        print(full_profiles)
        # Replace with full profiles
        result['top_astronauts'] = full_profiles

        log.info("Top Names: %s", top_names)
        log.info("Result keys: %s", list(result.keys()))
        return jsonify(result)

    except FileNotFoundError as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    except KeyError as e:
        traceback.print_exc()
        return jsonify({"error": f"CSV missing expected column: {e}"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Set host to 0.0.0.0 if you want LAN access
    app.run(debug=True, port=4000)
