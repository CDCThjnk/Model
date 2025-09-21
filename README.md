# 🚀 Astronaut Career Matcher

An innovative web application that matches users with astronauts based on their background, education, and career interests. Built with React, Next.js, Flask, and AI-powered features.

## ✨ Features

### Core Functionality
- **Dual Input Methods**: Complete a detailed questionnaire or upload your resume
- **AI-Powered Matching**: Uses Word2Vec embeddings to find similar astronauts
- **Interactive Visualizations**: 3D network graphs showing connections
- **Personalized Career Advice**: AI-generated recommendations based on matches
- **Face-Swap Feature**: Try on a virtual space suit (coming soon)

### User Experience
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Smooth Animations**: Framer Motion for engaging interactions
- **Real-time Processing**: Instant results and feedback
- **Mobile-Friendly**: Optimized for all device sizes

## 🏗️ Architecture

### Frontend (React/Next.js)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom space theme
- **3D Graphics**: Three.js with React Three Fiber
- **Forms**: React Hook Form for validation
- **Animations**: Framer Motion
- **File Upload**: React Dropzone

### Backend (Python/Flask)
- **API**: Flask with CORS support
- **ML Models**: Word2Vec for similarity matching
- **Resume Parsing**: PyPDF2, python-docx for text extraction
- **AI Integration**: OpenAI GPT for career advice
- **Data Processing**: Pandas, NumPy, scikit-learn

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- OpenAI API key (for AI advice feature)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Model
   ```

2. **Backend Setup**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt
   
   # Set up environment variables
   export OPENAI_API_KEY="your-openai-api-key"
   
   # Start the Flask server
   cd Final_script
   python enhanced_server.py
   ```

3. **Frontend Setup**
   ```bash
   # Install dependencies
   cd frontend
   npm install
   
   # Start the development server
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
Model/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── pages/           # Next.js pages
│   │   ├── components/       # Reusable components
│   │   └── styles/          # Global styles
│   ├── package.json
│   └── tailwind.config.js
├── Final_script/            # Flask backend
│   ├── enhanced_server.py   # Main Flask application
│   ├── final_functions.py   # ML matching functions
│   └── server.py            # Original server
├── Data Analysis/           # Data processing and ML models
│   ├── astronauts.csv       # Astronaut database
│   ├── astronauts_with_roles.pkl
│   └── word2vec_people_categories.model
├── astronauts_structured_fixed.jsonl
└── requirements.txt
```

## 🔧 API Endpoints

### Core Matching
- `POST /similar_astronauts` - Find similar astronauts
- `POST /parse_resume` - Extract data from uploaded resume
- `POST /generate_advice` - Generate AI career advice
- `GET /health` - Health check

### Request/Response Examples

**Find Similar Astronauts**
```json
POST /similar_astronauts
{
  "user_profile": {
    "name": "John Doe",
    "age": 25,
    "nationality": "American",
    "education": [{"institution": "MIT", "qualification": "Bachelor's"}],
    "occupations": ["Engineer", "Researcher"],
    "interests": ["Space", "Technology"]
  },
  "top_k": 3
}
```

**Parse Resume**
```json
POST /parse_resume
Content-Type: multipart/form-data
resume: <file>
```

## 🎨 Customization

### Theming
The application uses a custom space theme defined in `tailwind.config.js`:

```javascript
colors: {
  space: {
    dark: '#0B1426',
    navy: '#1E3A8A', 
    blue: '#3B82F6',
    light: '#E0F2FE',
  },
  accent: {
    gold: '#F59E0B',
    silver: '#6B7280',
  }
}
```

### Adding New Features
1. **New Questionnaire Questions**: Edit `questionnaire.tsx`
2. **Additional Resume Fields**: Modify `parse_resume_text()` in `enhanced_server.py`
3. **Custom Visualizations**: Add components in `src/components/`

## 🤖 AI Features

### Career Advice Generation
The app uses OpenAI's GPT models to generate personalized career advice:

```python
def generate_career_advice(user_profile, astronaut_match, similarity_score):
    # Generates contextual advice based on user background and astronaut match
    # Returns actionable recommendations for space career development
```

### Resume Parsing
Intelligent extraction of structured data from resumes:

- **Personal Information**: Name, email, phone
- **Education**: Institutions, degrees, qualifications  
- **Experience**: Job titles, companies, roles
- **Skills**: Technical and soft skills
- **Interests**: Hobbies and personal interests

## 📊 Data Sources

The application uses curated astronaut data including:
- **Profile Information**: Names, nationalities, ages
- **Education**: Universities, degrees, specializations
- **Career Paths**: Military service, research, engineering
- **Mission Data**: Space missions, roles, durations
- **Personal Interests**: Hobbies, activities, achievements

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy to Vercel or Netlify
```

### Backend (Heroku/Railway)
```bash
# Add Procfile
echo "web: python Final_script/enhanced_server.py" > Procfile

# Deploy to Heroku or Railway
```

### Environment Variables
- `OPENAI_API_KEY`: Required for AI advice generation
- `FLASK_ENV`: Set to 'production' for production deployment

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm test
```

### Backend Testing
```bash
python -m pytest tests/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NASA for astronaut data and inspiration
- OpenAI for AI-powered career advice
- The open-source community for amazing libraries
- All astronauts who inspire us to reach for the stars

## 📞 Support

For questions or support, please:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

---

**Built with ❤️ for aspiring astronauts and space enthusiasts**
