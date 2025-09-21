#!/bin/bash

# Astronaut Career Matcher - Startup Script
echo "🚀 Starting Astronaut Career Matcher..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install
cd ..

# Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY environment variable is not set."
    echo "   AI career advice feature will not work without this."
    echo "   You can set it with: export OPENAI_API_KEY='your-api-key'"
fi

echo ""
echo "🎉 Setup complete! Starting servers..."
echo ""
echo "To start the application:"
echo "1. Backend:  cd Final_script && python enhanced_server.py"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
echo "Happy space exploring! 🌟"
