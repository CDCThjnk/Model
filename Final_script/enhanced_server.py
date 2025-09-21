
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
from face_swap import process_face_swap

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

def _normalize_name(name: str) -> str:
    """Normalize name to 'Firstname Lastname' format for consistent matching"""
    if not name or not name.strip():
        return ""
    
    # Remove suffixes and clean up
    parts = []
    for part in name.strip().split():
        clean_part = _norm_token(part)
        if clean_part and clean_part not in SUFFIXES:
            parts.append(clean_part.title())
    
    if not parts:
        return ""
        
    # Handle comma-separated format "Last, First Middle"
    if ',' in name:
        left, right = name.split(',', 1)
        last_parts = [_norm_token(p).title() for p in left.strip().split() if _norm_token(p) not in SUFFIXES]
        first_parts = [_norm_token(p).title() for p in right.strip().split() if _norm_token(p) not in SUFFIXES]
        if last_parts and first_parts:
            return f"{first_parts[0]} {last_parts[0]}"
    
    # Regular format - assume first word is first name, last word is last name
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1]}"
    elif len(parts) == 1:
        return parts[0]
    
    return ""

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

def get_profiles_from_names(names: List[str], csv_path: str = CSV_PATH) -> Dict[str, Dict[str, Any]]:
    """Get profiles from CSV with robust name matching. Returns dict mapping normalized name -> profile"""
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    if 'Profile.Name' not in df.columns:
        raise KeyError("CSV must contain a 'Profile.Name' column")

    # Create normalized name column for matching
    if '___normalized_name' not in df.columns:
        df['___normalized_name'] = df['Profile.Name'].fillna("").apply(_normalize_name)

    found_profiles = {}
    
    for name in names:
        if not isinstance(name, str) or not name.strip():
            continue
            
        normalized_search = _normalize_name(name)
        if not normalized_search:
            continue
            
        log.info(f"Looking for '{name}' -> normalized: '{normalized_search}'")
        
        # Try exact match first
        exact_matches = df[df['___normalized_name'] == normalized_search]
        if not exact_matches.empty:
            profile = exact_matches.iloc[0].to_dict()
            found_profiles[normalized_search] = profile
            log.info(f"✅ Found exact match: {profile['Profile.Name']}")
            continue
            
        # Try fuzzy matching
        best_match = None
        best_score = 0
        
        for idx, csv_name in df['___normalized_name'].items():
            if not csv_name:
                continue
                
            # Simple similarity score based on common words
            search_words = set(normalized_search.lower().split())
            csv_words = set(csv_name.lower().split())
            
            if search_words and csv_words:
                intersection = len(search_words & csv_words)
                union = len(search_words | csv_words)
                score = intersection / union if union > 0 else 0
                
                if score > best_score and score >= 0.5:  # At least 50% similarity
                    best_score = score
                    best_match = idx
        
        if best_match is not None:
            profile = df.iloc[best_match].to_dict()
            found_profiles[normalized_search] = profile
            log.info(f"✅ Found fuzzy match: {name} -> {profile['Profile.Name']} (score: {best_score:.2f})")
        else:
            log.warning(f"❌ No match found for: {name}")
    
    return found_profiles

def extract_names(items: List[Dict[str, Any]]) -> List[str]:
    names = []
    for a in items:
        # Fix: Check for 'Profile.Name' field as well as 'Name' and 'name'
        n = a.get('Profile.Name') or a.get('Name') or a.get('name')
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
    print(f'Content-Type: {request.content_type}')
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

        print(f'\n🔍 CALLING MATCHING ALGORITHM...')
        result = find_similar_astronauts(user_profile, top_k=top_k)
        print(f'✅ Matching algorithm completed')

        top_astronauts = result.get('top_astronauts', [])
        role_scores = result.get('role_scores', {})
        
        print(f'\n📊 MATCHING RESULTS:')
        print(f'   Number of astronauts found: {len(top_astronauts)}')
        print(f'   Role scores: {role_scores}')
        
        if top_astronauts:
            print(f'\n👨‍🚀 ASTRONAUT DETAILS:')
            for i, astronaut in enumerate(top_astronauts[:3], 1):
                name = astronaut.get('Profile.Name', 'Unknown')
                similarity = astronaut.get('similarity', 0)
                print(f'   {i}. {name} (similarity: {similarity:.4f})')
        else:
            print('\n❌ NO ASTRONAUTS FOUND - This indicates a data loading or algorithm issue')
        
        log.info(f"Original top_astronauts count: {len(top_astronauts)}")
        if top_astronauts:
            log.info(f"First astronaut keys: {list(top_astronauts[0].keys())}")
            log.info(f"First astronaut similarity: {top_astronauts[0].get('similarity', 'NOT_FOUND')}")
        
        if not isinstance(top_astronauts, list):
            return jsonify({"error": "top_astronauts must be a list in the model result"}), 500

        # Extract names from algorithm results and get full profiles from CSV
        top_names = extract_names(top_astronauts)
        if not top_names:
            log.error("No names could be extracted from top_astronauts")
            result['top_astronauts'] = []
            return jsonify(result)
        
        log.info(f"Extracted names from algorithm: {top_names}")
        
        try:
            # Get profiles mapped by normalized name
            profiles_map = get_profiles_from_names(top_names, csv_path=CSV_PATH)
            log.info(f"CSV lookup returned {len(profiles_map)} profile matches")
        except Exception as e:
            log.error(f"CSV lookup failed: {e}. Using algorithm data as fallback")
            profiles_map = {}

        # Merge algorithm results with CSV profiles by name matching
        final_profiles = []
        for algorithm_astronaut in top_astronauts:
            # Extract name exactly like extract_names() does
            algorithm_name = algorithm_astronaut.get('Profile.Name') or algorithm_astronaut.get('Name') or algorithm_astronaut.get('name', '')
            normalized_name = _normalize_name(algorithm_name)
            similarity_score = algorithm_astronaut.get('similarity', 0.0)
            
            if normalized_name and normalized_name in profiles_map:
                # Use CSV profile with algorithm similarity score
                profile = profiles_map[normalized_name].copy()
                profile['similarity'] = similarity_score
                final_profiles.append(profile)
                log.info(f"✅ Merged: {algorithm_name} -> {profile.get('Profile.Name', 'Unknown')} (similarity: {similarity_score:.4f})")
            else:
                # Use algorithm result directly (will show as data unavailable for missions)
                algorithm_astronaut['data_unavailable'] = True
                final_profiles.append(algorithm_astronaut)
                log.warning(f"⚠️  Using algorithm data only for: {algorithm_name} (similarity: {similarity_score:.4f})")
        
        # Enforce exactly top_k results - pad with additional CSV entries if needed
        if len(final_profiles) < top_k:
            log.warning(f"Only found {len(final_profiles)} profiles, need {top_k}. Attempting to backfill...")
            
            # Try to get additional high-similarity astronauts to meet top_k requirement
            try:
                backfill_result = find_similar_astronauts(user_profile, top_k=top_k + 5)  # Get more candidates
                backfill_astronauts = backfill_result.get('top_astronauts', [])
                
                for backfill_astronaut in backfill_astronauts[len(final_profiles):]:
                    if len(final_profiles) >= top_k:
                        break
                    
                    backfill_name = backfill_astronaut.get('Profile.Name') or backfill_astronaut.get('Name') or backfill_astronaut.get('name', '')
                    normalized_backfill = _normalize_name(backfill_name)
                    
                    if normalized_backfill and normalized_backfill in profiles_map:
                        profile = profiles_map[normalized_backfill].copy()
                        profile['similarity'] = backfill_astronaut.get('similarity', 0.0)
                        final_profiles.append(profile)
                        log.info(f"✅ Backfilled: {backfill_name} (similarity: {profile['similarity']:.4f})")
                    
            except Exception as e:
                log.error(f"Backfill attempt failed: {e}")
        
        result['top_astronauts'] = final_profiles[:top_k]

        # Extract names for logging
        astronaut_names = [astronaut.get('Profile.Name', astronaut.get('name', 'Unknown')) for astronaut in top_astronauts]
        log.info("Top Names: %s", astronaut_names)
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

@app.route('/process_face_swap', methods=['POST'])
def process_face_swap_endpoint():
    """
    Process face swapping with astronaut suit helmet - WITH COMPREHENSIVE CONSOLE LOGGING
    """
    try:
        print(f'\n🎭 FACE SWAPPING API CALLED')
        data = request.get_json(silent=True) or {}
        selfie_data = data.get('selfie', '')
        
        print(f'📷 Selfie data received: {"✅ Yes" if selfie_data else "❌ No"}')
        if selfie_data:
            print(f'📏 Selfie data length: {len(selfie_data)} characters')
            print(f'🎨 Data format: {selfie_data[:50]}...')
        
        if not selfie_data:
            print('❌ No selfie data provided - returning error')
            return jsonify({"error": "No selfie data provided"}), 400
            
        print(f'🔄 Processing face swap...')
        # Process face swap with detailed logging
        result_image = process_face_swap(selfie_data)
        
        if result_image:
            print(f'✅ Face swap successful!')
            print(f'📤 Returning processed image (length: {len(result_image)} chars)')
            return jsonify({"astronaut_image": result_image})
        else:
            print('⚠️  Face swap failed - returning astronaut suit fallback')
            # Return original astronaut suit if face swap fails
            import base64
            with open("frontend/public/astronaut-suit.png", "rb") as f:
                suit_data = base64.b64encode(f.read()).decode('utf-8')
                fallback_result = f"data:image/png;base64,{suit_data}"
                print(f'📤 Returning fallback image (length: {len(fallback_result)} chars)')
                return jsonify({"astronaut_image": fallback_result})
                
    except Exception as e:
        print(f'❌ ERROR in face swap endpoint: {e}')
        log.error(f"Error in face swap endpoint: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    # Backend runs on port 3001, frontend proxies to it so user sees everything on port 5000
    port = int(os.environ.get('PORT', 3001))
    print(f"\n🚀 Starting Backend API on port {port}")
    print(f"📊 Console logging enabled for comprehensive debugging")
    print(f"🌐 Frontend proxies to this backend - everything appears on port 5000 to user")
    app.run(debug=True, port=port, host='0.0.0.0')
