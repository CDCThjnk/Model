# Astronaut Career Matcher - Replit Project Configuration

## Overview
This is a full-stack web application that matches users with astronauts based on their career background, education, and interests. It uses AI-powered matching with Word2Vec embeddings and provides personalized career advice through OpenAI integration.

## Project Architecture

### Frontend (Next.js/React)
- **Framework**: Next.js 14 with TypeScript
- **Port**: 5000 (configured for Replit proxy environment)
- **Styling**: Tailwind CSS with custom space theme
- **Features**: 
  - Interactive questionnaire
  - 3D animations with Three.js and React Three Fiber
  - Responsive design optimized for all devices
  - Framer Motion animations

### Backend (Flask/Python)
- **Framework**: Flask with CORS support
- **Port**: 3001 (localhost for backend communication)
- **ML Features**: 
  - Word2Vec embeddings for astronaut matching
  - Similarity scoring using cosine similarity
  - OpenAI integration for career advice generation
- **Data**: Astronaut database with education, career paths, and mission data

## Key Configuration Changes Made for Replit

### Frontend Configuration
1. **Next.js Config** (`frontend/next.config.js`):
   - Added allowedDevOrigins for Replit proxy environment
   - Configured API rewrites to backend on port 3001
   - Added headers to allow iframe embedding

2. **Package.json** (`frontend/package.json`):
   - Modified dev script to bind to 0.0.0.0:5000
   - Ensured all hosts are allowed for Replit proxy

3. **Fixed Hydration Issues**:
   - Updated star positioning in `index.tsx` to use deterministic positioning
   - Added client-side only rendering to prevent SSR/CSR mismatches

### Backend Configuration
1. **Enhanced Server** (`Final_script/enhanced_server.py`):
   - Fixed file paths to be relative to project root
   - Added environment-based port configuration
   - Configured to run on 0.0.0.0 for Replit environment

2. **Functions** (`Final_script/final_functions.py`):
   - Updated model and data file paths to be project-relative
   - Added proper error handling for missing files

## Workflows Configured
1. **Backend API**: Runs Flask server on port 3001
2. **Frontend**: Runs Next.js development server on port 5000

## Deployment Configuration
- **Target**: VM deployment (stateful application)
- **Build**: Builds Next.js frontend
- **Run**: Runs both backend and frontend concurrently

## Environment Requirements
- Python 3.11+ with required packages from requirements.txt
- Node.js 20+ with frontend dependencies
- OpenAI API key (optional, for AI advice features)

## Important File Locations
- **Frontend**: `/frontend/` directory
- **Backend**: `/Final_script/` directory  
- **Data**: `/Data Analysis/` directory
- **ML Models**: Root directory (word2vec_people_categories.model, etc.)

## Recent Changes (September 2025)
- Successfully imported and configured for Replit environment
- Fixed hydration errors in React components
- Configured proper port bindings and CORS settings
- Set up deployment configuration for production
- Both frontend and backend confirmed working correctly

## User Preferences
- Application successfully running on Replit
- All host configurations properly set for proxy environment
- Deployment ready for production use