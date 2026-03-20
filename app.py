from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

SEARCH_API_KEY = os.getenv('SEARCH_API_KEY')
SEARCH_API_URL = 'https://www.searchapi.io/api/v1/search'
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

class DataCollector:
    def __init__(self, file='collected_data.json'):
        self.file = file
    
    def save(self, message, category, response, feedback=None):
        try:
            with open(self.file, 'r') as f:
                data = json.load(f)
        except:
            data = []
        data.append({'timestamp': datetime.now().isoformat(), 'message': message, 'category': category, 'response': response, 'feedback': feedback})
        with open(self.file, 'w') as f:
            json.dump(data, f, indent=2)

class TriageSystem:
    def __init__(self, config_file='triage_config.json'):
        self.config_file = config_file
        self.reload()
    
    def reload(self):
        with open(self.config_file, 'r') as f:
            config = json.load(f)
        self.simple_kw = config['simple_keywords']
        self.complex_kw = config['complex_keywords']
        self.emergency_kw = config['emergency_keywords']
        self.simple_resp = config['simple_responses']
    
    def update_config(self, config):
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
        self.reload()
    
    def classify(self, message):
        msg = message.lower()
        if any(kw in msg for kw in self.emergency_kw):
            return 'emergency'
        if any(kw in msg for kw in self.complex_kw):
            return 'complex'
        if any(kw in msg for kw in self.simple_kw):
            return 'simple'
        return 'general'
    
    def get_simple_response(self, message):
        msg = message.lower()
        for key, resp in self.simple_resp.items():
            if key in msg:
                return resp
        return None

class MedicalDiagnosisModel:
    def __init__(self, data_file='data.json'):
        with open(data_file, 'r') as f:
            data = json.load(f)
        self.symptoms = data['symptoms']
        self.diseases = data['diseases']
        self.model = None
        self.scaler = StandardScaler()
        self.train_model()
    
    def train_model(self):
        np.random.seed(42)
        X = np.random.rand(500, len(self.symptoms))
        y = np.random.randint(0, len(self.diseases), 500)
        X_scaled = self.scaler.fit_transform(X)
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_scaled, y)
    
    def predict(self, symptoms_dict):
        features = [symptoms_dict.get(symptom, 0) for symptom in self.symptoms]
        features_scaled = self.scaler.transform([features])
        prediction = self.model.predict(features_scaled)[0]
        probabilities = self.model.predict_proba(features_scaled)[0]
        
        return {
            'diagnosis': self.diseases[prediction],
            'confidence': float(probabilities[prediction]),
            'all_probabilities': {
                disease: float(prob) 
                for disease, prob in zip(self.diseases, probabilities)
            }
        }

diagnosis_model = MedicalDiagnosisModel()
triage = TriageSystem()
collector = DataCollector()

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '').strip()
    
    # Use AI to decide if symptom cards needed
    try:
        headers = {'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'}
        prompt = f"User: '{message}'. Is this person reporting THEIR OWN health symptoms/problems (like 'I have fever', 'I feel sick')? Reply ONLY 'YES' or 'NO'. Questions about medicine info are 'NO'."
        payload = {
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'user', 'content': prompt}]
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=5)
        if response.status_code == 200:
            ai_data = response.json()
            decision = ai_data.get('choices', [{}])[0].get('message', {}).get('content', '').strip().upper()
            if 'YES' in decision:
                return jsonify({'response': '', 'trigger_cards': True})
    except:
        pass
    
    # Regular chat
    category = triage.classify(message)
    response_text = ''
    
    if category == 'emergency':
        response_text = '🚨 EMERGENCY: Call 911 or go to ER immediately!'
    elif category == 'simple':
        simple_resp = triage.get_simple_response(message)
        if simple_resp:
            response_text = simple_resp
    
    if not response_text:
        try:
            headers = {'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'}
            system_msg = 'You are a medical assistant. For complex cases, recommend seeing a doctor.' if category == 'complex' else 'You are a helpful medical chatbot.'
            payload = {
                'model': 'llama-3.3-70b-versatile',
                'messages': [{'role': 'system', 'content': system_msg}, {'role': 'user', 'content': message}]
            }
            response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                ai_data = response.json()
                response_text = ai_data.get('choices', [{}])[0].get('message', {}).get('content', '')
        except Exception as e:
            print(f'Error: {e}')
    
    if not response_text:
        response_text = 'No answer found.'
    
    collector.save(message, category, response_text)
    return jsonify({'response': response_text, 'type': category, 'triage': category, 'trigger_cards': False})

@app.route('/api/diagnose', methods=['POST'])
def diagnose():
    data = request.json
    symptoms = data.get('symptoms', {})
    
    if not symptoms:
        return jsonify({'error': 'No symptoms provided'}), 400
    
    result = diagnosis_model.predict(symptoms)
    
    # Use Groq API to generate explanation
    try:
        headers = {'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'}
        prompt = f"Explain in 2-3 sentences: Patient has {result['diagnosis']} with {result['confidence']*100:.1f}% confidence based on their symptoms."
        payload = {
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'user', 'content': prompt}]
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            ai_data = response.json()
            explanation = ai_data.get('choices', [{}])[0].get('message', {}).get('content', '')
        else:
            explanation = ''
    except:
        explanation = ''
    
    return jsonify({
        'diagnosis': result['diagnosis'],
        'confidence': result['confidence'],
        'probabilities': result['all_probabilities'],
        'explanation': explanation
    })

@app.route('/api/symptoms', methods=['GET'])
def get_symptoms():
    return jsonify({'symptoms': diagnosis_model.symptoms})

@app.route('/api/feedback', methods=['POST'])
def feedback():
    data = request.json
    message = data.get('message')
    rating = data.get('rating')
    try:
        with open('collected_data.json', 'r') as f:
            records = json.load(f)
        for r in reversed(records):
            if r['message'] == message:
                r['feedback'] = rating
                break
        with open('collected_data.json', 'w') as f:
            json.dump(records, f, indent=2)
        return jsonify({'status': 'ok'})
    except:
        return jsonify({'status': 'error'}), 500

@app.route('/api/analytics', methods=['GET'])
def analytics():
    try:
        with open('collected_data.json', 'r') as f:
            data = json.load(f)
        stats = {'total': len(data), 'simple': 0, 'complex': 0, 'emergency': 0, 'general': 0}
        for d in data:
            stats[d['category']] = stats.get(d['category'], 0) + 1
        return jsonify(stats)
    except:
        return jsonify({'total': 0})

@app.route('/api/triage/config', methods=['GET'])
def get_triage_config():
    with open('triage_config.json', 'r') as f:
        return jsonify(json.load(f))

@app.route('/api/triage/config', methods=['PUT'])
def update_triage_config():
    config = request.json
    triage.update_config(config)
    return jsonify({'status': 'ok'})

@app.route('/api/triage/keywords', methods=['POST'])
def add_keywords():
    data = request.json
    category = data.get('category')
    keywords = data.get('keywords', [])
    with open('triage_config.json', 'r') as f:
        config = json.load(f)
    key_map = {'simple': 'simple_keywords', 'complex': 'complex_keywords', 'emergency': 'emergency_keywords'}
    if category in key_map:
        config[key_map[category]].extend(keywords)
        triage.update_config(config)
        return jsonify({'status': 'ok'})
    return jsonify({'error': 'Invalid category'}), 400

@app.route('/api/triage/response', methods=['POST'])
def add_simple_response():
    data = request.json
    keyword = data.get('keyword')
    response = data.get('response')
    with open('triage_config.json', 'r') as f:
        config = json.load(f)
    config['simple_responses'][keyword] = response
    triage.update_config(config)
    return jsonify({'status': 'ok'})

@app.route('/api/collected-data', methods=['GET'])
def get_collected_data():
    try:
        with open('collected_data.json', 'r') as f:
            return jsonify(json.load(f))
    except:
        return jsonify([])

@app.route('/api/symptom-flow', methods=['GET'])
def get_symptom_flow():
    message = request.args.get('message', '')
    if message:
        try:
            headers = {'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'}
            prompt = f"User: '{message}'. Generate 5-7 medical triage questions as JSON. Format: {{\"flow\": [{{\"id\": \"fever\", \"question\": \"Do you have fever?\", \"type\": \"yesno\"}}, {{\"id\": \"duration\", \"question\": \"How long?\", \"type\": \"choice\", \"options\": [\"<24h\", \"1-3d\", \">7d\"]}}]}}. Types: yesno, choice, multichoice. Return ONLY valid JSON, no markdown."
            payload = {
                'model': 'llama-3.3-70b-versatile',
                'messages': [{'role': 'system', 'content': 'Return only valid JSON, no markdown or explanation.'}, {'role': 'user', 'content': prompt}]
            }
            response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                ai_data = response.json()
                content = ai_data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
                if content.startswith('```'):
                    content = content.split('\n', 1)[1].rsplit('\n```', 1)[0]
                flow_data = json.loads(content)
                return jsonify(flow_data)
        except Exception as e:
            print(f'AI Flow Error: {e}')
    with open('symptom_flow.json', 'r') as f:
        return jsonify(json.load(f))

@app.route('/api/symptom-collect', methods=['POST'])
def collect_symptoms():
    data = request.json
    answers = data.get('answers', {})
    
    try:
        headers = {'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'}
        prompt = f"Patient answers: {json.dumps(answers)}. Provide: 1) Summary list 2) Assessment (2 sentences) 3) Urgency (low/medium/high) 4) Recommendation. Return JSON: {{\"summary\": [\"...\"], \"assessment\": \"...\", \"urgency\": \"low\", \"recommendation\": \"...\"}}. Return only JSON."
        payload = {
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'system', 'content': 'You are a medical triage assistant. Return only valid JSON.'}, {'role': 'user', 'content': prompt}]
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            ai_data = response.json()
            content = ai_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            result = json.loads(content)
            collector.save(str(answers), 'symptom_collection', str(result))
            return jsonify(result)
    except Exception as e:
        print(f'Error: {e}')
    
    return jsonify({'summary': ['Unable to process'], 'assessment': 'Error occurred', 'urgency': 'low', 'recommendation': 'Try again'})

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
