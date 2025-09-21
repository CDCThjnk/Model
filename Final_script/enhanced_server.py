
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
import PyPDF2
import docx
from io import BytesIO
import openai
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Configuration
CSV_PATH = '/Users/harjyot/Desktop/code/Model/Data Analysis/astronauts.csv'
UPLOAD_FOLDER = '/Users/harjyot/Desktop/code/Model/uploads'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# OpenAI configuration (you'll need to set your API key)
openai.api_key = os.getenv('OPENAI_API_KEY', 'your-openai-api-key-here')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size

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

# Resume parsing functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_content):
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        log.error(f"Error extracting text from PDF: {e}")
        return ""

def extract_text_from_docx(file_content):
    try:
        doc = docx.Document(BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        log.error(f"Error extracting text from DOCX: {e}")
        return ""

def extract_text_from_txt(file_content):
    try:
        return file_content.decode('utf-8')
    except Exception as e:
        log.error(f"Error extracting text from TXT: {e}")
        return ""

def parse_resume_text(text):
    """Extract structured information from resume text using regex patterns"""
    
    # Initialize result structure
    result = {
        'name': '',
        'email': '',
        'phone': '',
        'education': [],
        'occupations': [],
        'skills': [],
        'interests': [],
        'nationality': '',
        'age': None
    }
    
    # Extract name (usually at the top)
    name_patterns = [
        r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)',
        r'Name:\s*([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)',
        r'^([A-Z][a-z]+ [A-Z][a-z]+)'
    ]
    
    for pattern in name_patterns:
        match = re.search(pattern, text, re.MULTILINE)
        if match:
            result['name'] = match.group(1).strip()
            break
    
    # Extract email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, text)
    if email_match:
        result['email'] = email_match.group(0)
    
    # Extract phone
    phone_patterns = [
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
        r'\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}'
    ]
    
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            result['phone'] = phone_match.group(0)
            break
    
    # Extract education
    education_keywords = ['university', 'college', 'institute', 'school', 'degree', 'bachelor', 'master', 'phd', 'doctorate']
    education_pattern = r'(?i)(?:education|academic|qualification).*?(?=\n\n|\n[A-Z]|$)'
    education_match = re.search(education_pattern, text, re.DOTALL)
    
    if education_match:
        education_text = education_match.group(0)
        lines = education_text.split('\n')
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in education_keywords):
                # Extract institution and degree
                institution_match = re.search(r'([A-Z][a-zA-Z\s&]+(?:University|College|Institute|School))', line)
                degree_match = re.search(r'(Bachelor|Master|PhD|Doctorate|Associate|Certificate)', line, re.IGNORECASE)
                
                if institution_match or degree_match:
                    result['education'].append({
                        'institution': institution_match.group(1) if institution_match else 'Unknown Institution',
                        'qualification': degree_match.group(1) if degree_match else 'Degree'
                    })
    
    # Extract work experience/occupations
    experience_keywords = ['experience', 'employment', 'work', 'career', 'professional']
    experience_pattern = r'(?i)(?:experience|employment|work|career|professional).*?(?=\n\n|\n[A-Z]|$)'
    experience_match = re.search(experience_pattern, text, re.DOTALL)
    
    if experience_match:
        experience_text = experience_match.group(0)
        lines = experience_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and not any(keyword in line.lower() for keyword in ['experience', 'employment', 'work']):
                # Extract job titles
                job_title_patterns = [
                    r'(?:Senior|Junior|Lead|Principal|Staff)?\s*(Engineer|Developer|Manager|Analyst|Consultant|Specialist|Coordinator|Director|Officer)',
                    r'([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)'
                ]
                
                for pattern in job_title_patterns:
                    job_match = re.search(pattern, line)
                    if job_match:
                        result['occupations'].append(job_match.group(1).strip())
                        break
    
    # Extract skills
    skills_keywords = ['skills', 'technical', 'competencies', 'abilities']
    skills_pattern = r'(?i)(?:skills|technical|competencies|abilities).*?(?=\n\n|\n[A-Z]|$)'
    skills_match = re.search(skills_pattern, text, re.DOTALL)
    
    if skills_match:
        skills_text = skills_match.group(0)
        # Common technical skills
        common_skills = [
            'Python', 'Java', 'JavaScript', 'C++', 'C#', 'SQL', 'HTML', 'CSS',
            'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring',
            'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Windows',
            'Machine Learning', 'Data Analysis', 'Project Management', 'Agile',
            'Scrum', 'DevOps', 'Cybersecurity', 'Database Design', 'UI/UX'
        ]
        
        for skill in common_skills:
            if skill.lower() in skills_text.lower():
                result['skills'].append(skill)
    
    # Extract interests/hobbies
    interests_keywords = ['interests', 'hobbies', 'activities', 'passions']
    interests_pattern = r'(?i)(?:interests|hobbies|activities|passions).*?(?=\n\n|\n[A-Z]|$)'
    interests_match = re.search(interests_pattern, text, re.DOTALL)
    
    if interests_match:
        interests_text = interests_match.group(0)
        lines = interests_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and not any(keyword in line.lower() for keyword in interests_keywords):
                result['interests'].append(line)
    
    # Clean up and deduplicate
    result['occupations'] = list(set(result['occupations']))[:10]  # Limit to 10
    result['skills'] = list(set(result['skills']))[:15]  # Limit to 15
    result['interests'] = list(set(result['interests']))[:10]  # Limit to 10
    
    return result

def generate_career_advice(user_profile, astronaut_match, similarity_score):
    """Generate AI-powered career advice using OpenAI"""
    
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
        log.error(f"Error generating career advice: {e}")
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

@app.route('/parse_resume', methods=['POST'])
def parse_resume():
    try:
        if 'resume' not in request.files:
            return jsonify({"error": "No resume file provided"}), 400
        
        file = request.files['resume']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed"}), 400
        
        # Read file content
        file_content = file.read()
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower()
        
        # Extract text based on file type
        text = ""
        if file_extension == 'pdf':
            text = extract_text_from_pdf(file_content)
        elif file_extension == 'docx':
            text = extract_text_from_docx(file_content)
        elif file_extension == 'doc':
            text = extract_text_from_docx(file_content)  # Try docx parser for .doc files
        elif file_extension == 'txt':
            text = extract_text_from_txt(file_content)
        
        if not text.strip():
            return jsonify({"error": "Could not extract text from file"}), 400
        
        # Parse the extracted text
        parsed_data = parse_resume_text(text)
        
        log.info("Successfully parsed resume for: %s", parsed_data.get('name', 'Unknown'))
        return jsonify(parsed_data)
        
    except Exception as e:
        log.error(f"Error parsing resume: {e}")
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

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(debug=True, port=4000, host='0.0.0.0')
