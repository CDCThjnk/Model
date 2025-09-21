
# Enhanced server.py with resume parsing and AI advice
from flask import Flask, request, jsonify
from flask_cors import CORS
from final_functions import find_similar_astronauts
import traceback
import pandas as pd
import logging
from typing import List, Dict, Any
import os
import re
import json
from werkzeug.utils import secure_filename
import openai
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Configuration
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Data Analysis', 'astronauts.csv')

# OpenAI configuration (you'll need to set your API key)
openai.api_key = os.getenv('OPENAI_API_KEY', None)


# Name matching functions (existing code)
SUFFIXES = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}

def _norm_token(s: str) -> str:
    return re.sub(r"[^\w\-']", "", s.casefold()).strip()

def _split_candidate_name(full: str):
    parts = full.strip().split()
    if not parts:
        return None, None
    first = _norm_token(parts[0])
    last = _norm_token(parts[-1])
    if last == first and len(parts) == 1:
        return first, None
    return first, last

def _split_csv_name(csv_name: str):
    left, sep, right = csv_name.partition(",")
    last = _norm_token(left) if sep else _norm_token(csv_name)
    first = ""
    if sep:
        right_tokens = [_norm_token(t) for t in right.strip().split()]
        right_tokens = [t for t in right_tokens if t and t not in SUFFIXES]
        first = right_tokens[0] if right_tokens else ""
    return first, last

def get_profiles_from_names(names: List[str], csv_path: str = CSV_PATH) -> List[Dict[str, Any]]:
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    if 'Profile.Name' not in df.columns:
        raise KeyError("CSV must contain a 'Profile.Name' column")

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
        if cf is None:
            continue

        mask = True
        if cl:
            mask = mask & (df['___norm_last'] == cl)
        mask = mask & (df['___norm_first'].str.startswith(cf))

        matches = df[mask]

        if matches.empty and cl:
            mask2 = (df['___norm_last'].str.startswith(cl)) & (df['___norm_first'].str.startswith(cf))
            matches = df[mask2]

        if not matches.empty:
            wanted.append(matches)

    if not wanted:
        return []

    out = pd.concat(wanted, ignore_index=True)
    out = out.drop_duplicates(subset=['Profile.Name'])
    return out.to_dict(orient='records')

def extract_names(items: List[Dict[str, Any]]) -> List[str]:
    names = []
    for a in items:
        n = a.get('Name') or a.get('name')
        if isinstance(n, str) and n.strip():
            names.append(n.strip())
    return names


def generate_career_advice(user_profile, astronaut_match, similarity_score):
    """Generate AI-powered career advice using OpenAI"""
    
    # Check if OpenAI API key is available
    if not openai.api_key:
        log.info("OpenAI API key not configured, using fallback career advice")
        return f"""
        Based on your {similarity_score:.1%} similarity with {astronaut_match.get('name', 'this astronaut')}, 
        you share a strong foundation for a space career. Your background in {', '.join(user_profile.get('occupations', ['your field']))} 
        aligns well with the astronaut's path. Consider developing skills in leadership, technical expertise, 
        and teamwork - all crucial for space missions. Pursue advanced education in STEM fields, gain 
        experience in high-pressure environments, and consider military or research positions that build 
        the resilience and expertise needed for space exploration.
        """
    
    try:
        prompt = f"""
        You are an expert career counselor specializing in space careers and astronaut development. 
        
        User Profile:
        - Name: {user_profile.get('name', 'Unknown')}
        - Age: {user_profile.get('age', 'Unknown')}
        - Nationality: {user_profile.get('nationality', 'Unknown')}
        - Education: {user_profile.get('education', [])}
        - Career Interests: {user_profile.get('occupations', [])}
        - Skills: {user_profile.get('skills', [])}
        - Interests: {user_profile.get('interests', [])}
        
        Matched Astronaut:
        - Name: {astronaut_match.get('name', 'Unknown')}
        - Similarity Score: {similarity_score:.2f}
        - Education: {astronaut_match.get('education', [])}
        - Occupations: {astronaut_match.get('occupations', [])}
        - Time in Space: {astronaut_match.get('time_in_space', 'Unknown')}
        - Nationality: {astronaut_match.get('nationality', 'Unknown')}
        
        Please provide personalized career advice in 2-3 paragraphs that:
        1. Explains why this astronaut is a good match for the user
        2. Provides specific recommendations for skills to develop
        3. Suggests career paths or experiences to pursue
        4. Includes motivational and inspiring language about space careers
        
        Make the advice practical, actionable, and encouraging. Focus on concrete next steps the user can take.
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert career counselor specializing in space careers and astronaut development."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        log.error(f"Error generating career advice with OpenAI: {e}")
        return f"""
        Based on your {similarity_score:.1%} similarity with {astronaut_match.get('name', 'this astronaut')}, 
        you share a strong foundation for a space career. Your background in {', '.join(user_profile.get('occupations', ['your field']))} 
        aligns well with the astronaut's path. Consider developing skills in leadership, technical expertise, 
        and teamwork - all crucial for space missions. Pursue advanced education in STEM fields, gain 
        experience in high-pressure environments, and consider military or research positions that build 
        the resilience and expertise needed for space exploration.
        """

# API Routes
@app.route('/similar_astronauts', methods=['POST'])
def similar_astronauts():
    print('=== BACKEND API CALL RECEIVED ===')
    print(f'Request method: {request.method}')
    print(f'Request path: {request.path}')
    print(f'Request headers: {dict(request.headers)}')
    try:
        data = request.get_json(silent=True) or {}
        print(f'Request data: {data}')
        user_profile = data.get('user_profile')
        top_k = data.get('top_k', 3)
        print(f'User profile: {user_profile}')
        print(f'Top K: {top_k}')

        if not isinstance(user_profile, dict):
            return jsonify({"error": "user_profile must be a JSON object"}), 400
        try:
            top_k = int(top_k)
        except (TypeError, ValueError):
            return jsonify({"error": "top_k must be an integer"}), 400

        result = find_similar_astronauts(user_profile, top_k=top_k)

        top_astronauts = result.get('top_astronauts', [])
        log.info(f"Original top_astronauts count: {len(top_astronauts)}")
        if top_astronauts:
            log.info(f"First astronaut keys: {list(top_astronauts[0].keys())}")
            log.info(f"First astronaut similarity: {top_astronauts[0].get('similarity', 'NOT_FOUND')}")
        
        if not isinstance(top_astronauts, list):
            return jsonify({"error": "top_astronauts must be a list in the model result"}), 500

        top_names = extract_names(top_astronauts)
        if not top_names:
            result['top_astronauts'] = []
            return jsonify(result)

        full_profiles = get_profiles_from_names(top_names, csv_path=CSV_PATH)
        
        # Merge similarity scores from original results with full profiles
        for i, full_profile in enumerate(full_profiles):
            if i < len(top_astronauts):
                # Preserve the similarity score from the original calculation
                similarity_score = top_astronauts[i].get('similarity', 0.0)
                full_profile['similarity'] = similarity_score
                log.info(f"Astronaut {i}: {full_profile.get('Profile.Name', 'Unknown')} - Similarity: {similarity_score}")
        
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


@app.route('/generate_advice', methods=['POST'])
def generate_advice():
    try:
        data = request.get_json(silent=True) or {}
        user_profile = data.get('user_profile')
        astronaut_match = data.get('astronaut_match')
        similarity_score = data.get('similarity_score', 0)
        
        if not user_profile or not astronaut_match:
            return jsonify({"error": "user_profile and astronaut_match are required"}), 400
        
        advice = generate_career_advice(user_profile, astronaut_match, similarity_score)
        
        return jsonify({"advice": advice})
        
    except Exception as e:
        log.error(f"Error generating advice: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/generate_biography', methods=['POST'])
def generate_biography():
    """
    Generate a short biography for an astronaut using AI
    """
    try:
        data = request.get_json(silent=True) or {}
        astronaut_name = data.get('astronaut_name', 'Unknown')
        nationality = data.get('nationality', 'Unknown')
        mission_count = data.get('mission_count', 0)
        mission_duration = data.get('mission_duration', 0)
        role = data.get('role', 'Astronaut')
        
        # Check if OpenAI API key is available
        if not openai.api_key:
            log.info("OpenAI API key not configured, using fallback biography")
            biography = f"{astronaut_name} is a distinguished astronaut from {nationality} with {mission_count} space missions and {mission_duration} days in space. Their role as {role} demonstrates their expertise and dedication to space exploration."
        else:
            try:
                prompt = f"""
                Write a brief, inspiring biography (2-3 sentences) for astronaut {astronaut_name} from {nationality}.
                They have {mission_count} space missions and {mission_duration} days in space.
                Their role was {role}.
                Make it engaging and highlight their achievements.
                """
                
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a space historian writing inspiring astronaut biographies."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=150,
                    temperature=0.7
                )
                
                biography = response.choices[0].message.content.strip()
                
            except Exception as e:
                log.error(f"Error generating biography with OpenAI: {e}")
                # Fallback biography
                biography = f"{astronaut_name} is a distinguished astronaut from {nationality} with {mission_count} space missions and {mission_duration} days in space. Their role as {role} demonstrates their expertise and dedication to space exploration."
        
        return jsonify({"biography": biography})
        
    except Exception as e:
        log.error(f"Error generating biography: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/generate_career_timeline', methods=['POST'])
def generate_career_timeline():
    """
    Generate career timeline points for an astronaut using AI
    """
    try:
        data = request.get_json(silent=True) or {}
        astronaut_name = data.get('astronaut_name', 'Unknown')
        mission_count = data.get('mission_count', 0)
        mission_duration = data.get('mission_duration', 0)
        role = data.get('role', 'Astronaut')
        
        # Check if OpenAI API key is available
        if not openai.api_key:
            log.info("OpenAI API key not configured, using fallback timeline")
            timeline = [
                "Selected for astronaut training program",
                "Completed intensive space mission preparation",
                "First space mission launch", 
                "Advanced to senior astronaut role",
                "Retired from active space missions"
            ]
        else:
            try:
                prompt = f"""
                Create 5 career milestones for astronaut {astronaut_name} who had {mission_count} missions and {mission_duration} days in space.
                Each milestone should be exactly 10 words or less.
                Include: selection, training, first mission, advancement, and final achievement.
                Return as a JSON array of strings.
                """
                
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a space career analyst. Return only valid JSON arrays."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=200,
                    temperature=0.7
                )
                
                timeline_text = response.choices[0].message.content.strip()
                # Try to parse as JSON, fallback if it fails
                try:
                    timeline = json.loads(timeline_text)
                except:
                    timeline = [
                        "Selected for astronaut training program",
                        "Completed intensive space mission preparation", 
                        "First space mission launch",
                        "Advanced to senior astronaut role",
                        "Retired from active space missions"
                    ]
                
            except Exception as e:
                log.error(f"Error generating timeline with OpenAI: {e}")
                # Fallback timeline
                timeline = [
                    "Selected for astronaut training program",
                    "Completed intensive space mission preparation",
                    "First space mission launch", 
                    "Advanced to senior astronaut role",
                    "Retired from active space missions"
                ]
        
        return jsonify({"timeline": timeline})
        
    except Exception as e:
        log.error(f"Error generating career timeline: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    app.run(debug=True, port=port, host='0.0.0.0')
