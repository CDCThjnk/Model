#!/usr/bin/env python3
"""
Test script for Astronaut Career Matcher backend
"""

import requests
import json
import sys
import time

def test_backend():
    """Test the backend API endpoints"""
    base_url = "http://localhost:5000"
    
    print("🧪 Testing Astronaut Career Matcher Backend...")
    print("=" * 50)
    
    # Test 1: Health check
    print("1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Health check passed")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Health check failed: {e}")
        return False
    
    # Test 2: Similar astronauts endpoint
    print("2. Testing similar astronauts endpoint...")
    test_profile = {
        "name": "Test User",
        "age": 25,
        "nationality": "American",
        "education": [
            {"institution": "MIT", "qualification": "Bachelor's in Engineering"}
        ],
        "occupations": ["Engineer", "Researcher"],
        "interests": ["Space", "Technology", "Science"],
        "languages": ["English"],
        "technicalSkills": ["Programming", "Data Analysis"],
        "teamworkPreference": "collaborator",
        "ageAtMission": 30,
        "leadershipExperience": "some",
        "hobbies": ["Reading", "Hiking", "Astronomy"]
    }
    
    try:
        response = requests.post(
            f"{base_url}/similar_astronauts",
            json={"user_profile": test_profile, "top_k": 3},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if "top_astronauts" in data and "role_scores" in data:
                print("   ✅ Similar astronauts endpoint working")
                print(f"   📊 Found {len(data['top_astronauts'])} matches")
                if data['top_astronauts']:
                    top_match = data['top_astronauts'][0]
                    print(f"   🎯 Top match: {top_match.get('Profile.Name', 'Unknown')}")
            else:
                print("   ❌ Invalid response format")
                return False
        else:
            print(f"   ❌ Similar astronauts failed: {response.status_code}")
            print(f"   📝 Response: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Similar astronauts failed: {e}")
        return False
    
    # Test 3: Generate advice endpoint
    print("3. Testing AI advice generation...")
    try:
        advice_data = {
            "user_profile": test_profile,
            "astronaut_match": {
                "name": "Test Astronaut",
                "similarity": 0.85,
                "education": [{"institution": "NASA", "qualification": "PhD"}],
                "occupations": ["Astronaut", "Engineer"],
                "time_in_space": "180 days",
                "nationality": "American"
            },
            "similarity_score": 0.85
        }
        
        response = requests.post(
            f"{base_url}/generate_advice",
            json=advice_data,
            timeout=15
        )
        if response.status_code == 200:
            data = response.json()
            if "advice" in data and data["advice"]:
                print("   ✅ AI advice generation working")
                print(f"   💡 Advice preview: {data['advice'][:100]}...")
            else:
                print("   ⚠️  AI advice generation returned empty advice")
        else:
            print(f"   ⚠️  AI advice generation failed: {response.status_code}")
            print("   (This might be due to missing OpenAI API key)")
    except requests.exceptions.RequestException as e:
        print(f"   ⚠️  AI advice generation failed: {e}")
        print("   (This might be due to missing OpenAI API key)")
    
    print("\n🎉 Backend tests completed!")
    print("=" * 50)
    return True

def main():
    """Main test function"""
    print("Starting backend tests...")
    print("Make sure the Flask server is running on http://localhost:5000")
    print("You can start it with: cd Final_script && python enhanced_server.py")
    print()
    
    # Wait a moment for user to read
    time.sleep(2)
    
    success = test_backend()
    
    if success:
        print("\n✅ All core tests passed! Your backend is working correctly.")
        print("\nNext steps:")
        print("1. Start the frontend: cd frontend && npm run dev")
        print("2. Visit http://localhost:3000")
        print("3. Try the questionnaire or upload a resume!")
    else:
        print("\n❌ Some tests failed. Please check the backend setup.")
        print("\nTroubleshooting:")
        print("1. Make sure the Flask server is running")
        print("2. Check that all dependencies are installed")
        print("3. Verify the data files exist")
        sys.exit(1)

if __name__ == "__main__":
    main()
