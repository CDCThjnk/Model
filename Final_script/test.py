# test request to server
import requests
import json
url = "http://127.0.0.1:5000/similar_astronauts"
user_profile = {
    "education": [{"institution": "MIT"}],
    "occupations": ["Engineer"],
    "interests": ["Space Exploration"],
    "nationality": "USA"
}
payload = {
    "user_profile": user_profile,
    "top_k": 3
}
headers = {'Content-Type': 'application/json'}
response = requests.post(url, data=json.dumps(payload), headers=headers)
print(response.json())