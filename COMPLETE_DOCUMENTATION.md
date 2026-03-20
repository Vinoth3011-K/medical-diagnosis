# Medical Diagnosis Chatbot - Complete Enhanced System

## 🎯 Overview

A comprehensive AI-powered medical diagnosis chatbot with advanced features including smart diagnosis, location-based doctor recommendations, multi-language support, voice assistant, user authentication, emergency detection, and chat history.

## ✨ Features Implemented

### 1. **Smart Diagnosis Improvement** ✅
- AI-powered symptom severity analysis (MILD/MODERATE/SEVERE)
- Intelligent follow-up question generation
- Urgency level detection (low/medium/high/emergency)
- Detailed condition assessment with confidence scores
- Medical specialty recommendations

### 2. **Doctor Recommendation Based on Location** ✅
- Real-time geolocation detection
- Google Maps API integration
- Filters for 4+ star rated doctors/hospitals
- Shows: Name, Address, Rating, Distance, Phone, Website
- Direct booking links and Google Maps navigation
- Radius-based search (default 5km)

### 3. **Appointment Booking Integration** ✅
- Direct links to hospital/doctor websites
- Google Maps integration for navigation
- Phone numbers for direct contact
- Booking URL redirection

### 4. **Multi-Language Support** ✅
- **English** - Full support
- **Tamil** - Native script support
- **Hindi** - Native script support
- **Tanglish** - Tamil in English letters
- Auto language detection
- Real-time translation using deep-translator

### 5. **Voice Assistant Feature** ✅
- Speech-to-Text (Web Speech API)
- Text-to-Speech responses
- Multi-language voice support
- Visual voice recording indicator

### 6. **Chat History Storage** ✅
- SQLite database with SQLAlchemy ORM
- Session-based conversation tracking
- User-specific history
- Diagnosis record storage
- Timestamp tracking
- Export capability

### 7. **UI/UX Improvements** ✅
- Professional medical theme (#21666d)
- Responsive design (mobile/tablet/desktop)
- Smooth animations and transitions
- Loading indicators
- Emergency alert styling
- Clean card-based layouts

### 8. **Emergency Detection** ✅
- Keyword-based critical condition detection
- Automatic emergency alerts
- Visual emergency indicators (red borders, pulsing)
- Immediate action recommendations
- Emergency service contact information

### 9. **Medical Disclaimer** ✅
- Comprehensive legal disclaimer
- Displayed on home screen
- Added to all diagnosis responses
- Terms of service acknowledgment

### 10. **User Login System** ✅
- JWT-based authentication
- Secure password hashing (Werkzeug)
- User registration and login
- Session management
- Protected API endpoints
- User profile storage

---

## 🏗️ Architecture

### Backend Stack
```
Flask (Python Web Framework)
├── Flask-CORS (Cross-Origin Resource Sharing)
├── Flask-SQLAlchemy (ORM for Database)
├── PyJWT (JSON Web Tokens for Auth)
├── Werkzeug (Password Hashing)
├── deep-translator (Multi-language Translation)
└── requests (API Calls)
```

### Frontend Stack
```
React + Vite
├── Axios (HTTP Client)
├── Web Speech API (Voice Features)
└── CSS3 (Styling & Animations)
```

### Database Schema
```sql
User
├── id (Primary Key)
├── user_id (Unique UUID)
├── email (Unique)
├── password_hash
├── name
├── phone
└── created_at

ChatHistory
├── id (Primary Key)
├── user_id (Foreign Key)
├── session_id
├── message
├── response
├── language
├── is_emergency
└── timestamp

DiagnosisRecord
├── id (Primary Key)
├── user_id (Foreign Key)
├── session_id
├── symptoms (JSON)
├── severity
├── urgency
├── diagnosis
├── recommendations
├── is_emergency
└── timestamp
```

### API Architecture
```
External APIs:
├── Groq AI API (llama-3.3-70b-versatile)
│   ├── Symptom analysis
│   ├── Diagnosis generation
│   └── Conversation handling
│
├── Google Maps API
│   ├── Geolocation
│   ├── Places Search (Nearby Doctors)
│   └── Place Details (Contact Info)
│
└── deep-translator
    └── Multi-language translation
```

---

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- Groq API Key
- Google Maps API Key (optional but recommended)

### Backend Setup

1. **Install Python Dependencies**
```bash
cd d:\PJ1
pip install -r requirements_final.txt
```

2. **Create .env File**
```bash
# Create .env in project root
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
```

3. **Initialize Database**
```bash
python app_final.py
# Database will be created automatically on first run
```

4. **Run Flask Server**
```bash
python app_final.py
# Server runs on http://localhost:5000
```

### Frontend Setup

1. **Install Node Dependencies**
```bash
npm install
```

2. **Update Component Files**
```bash
# Replace existing files with final versions:
# App.jsx -> App_final.jsx
# SymptomCards.jsx -> SymptomCards_final.jsx
# Add new files: AuthModal.jsx, AuthModal.css
```

3. **Run Development Server**
```bash
npm run dev
# Frontend runs on http://localhost:5173 or http://localhost:3000
```

---

## 📡 API Endpoints

### Authentication
```
POST /api/register
Body: { email, password, name, phone }
Response: { token, user }

POST /api/login
Body: { email, password }
Response: { token, user }
```

### Chat & Diagnosis
```
POST /api/chat (Protected)
Headers: { Authorization: Bearer <token> }
Body: { message, session_id, language }
Response: { response, trigger_cards, is_emergency, session_id }

POST /api/symptom-analyze (Protected)
Headers: { Authorization: Bearer <token> }
Body: { answers, session_id, location, language }
Response: { severity, urgency, conditions, actions, doctors, disclaimer }
```

### History
```
GET /api/chat-history (Protected)
Headers: { Authorization: Bearer <token> }
Response: { sessions: {...} }

GET /api/diagnosis-history (Protected)
Headers: { Authorization: Bearer <token> }
Response: { history: [...] }
```

### Disclaimer
```
GET /api/disclaimer
Response: { disclaimer: "..." }
```

---

## 🔧 Configuration

### Emergency Keywords
Located in `app_final.py`:
```python
EMERGENCY_KEYWORDS = [
    'chest pain', 'heart attack', 'stroke', 'unconscious', 
    'seizure', 'severe bleeding', 'can\'t breathe', 'suicide', 
    'overdose', 'severe burn', 'broken bone', 'head injury', 
    'poisoning'
]
```

### Language Support
```python
Supported Languages:
- 'en' - English
- 'ta' - Tamil
- 'hi' - Hindi
- Auto-detection for Tanglish
```

### Doctor Search Parameters
```python
Default Radius: 5000 meters (5km)
Minimum Rating: 4.0 stars
Maximum Results: 5 doctors
Search Type: 'hospital' + specialty keyword
```

---

## 🎨 UI Components

### Home Screen
- Full-screen landing page
- 6 feature cards
- Login/Register buttons
- Medical disclaimer link
- Professional medical background

### Chat Interface
- Message history display
- Real-time typing indicators
- Emergency alert styling
- Urgency badges
- Language selector
- Voice assistant button
- Chat history sidebar

### Authentication Modal
- Login/Register toggle
- Form validation
- Error handling
- Secure password input
- Terms acceptance

### Symptom Cards
- Dynamic question flow
- Progress indicator
- Multiple input types (text, select, range, multiselect)
- Back navigation
- Auto-advance

### Doctor Recommendations
- Card-based layout
- Rating display
- Distance calculation
- Contact information
- Booking links
- Google Maps integration

---

## 🔒 Security Features

1. **Password Security**
   - Werkzeug password hashing
   - Minimum 6 characters
   - Secure storage

2. **JWT Authentication**
   - 30-day token expiration
   - Protected API endpoints
   - Token validation middleware

3. **CORS Configuration**
   - Restricted origins
   - Credentials support
   - Secure headers

4. **Input Validation**
   - Email format validation
   - Required field checks
   - SQL injection prevention (SQLAlchemy ORM)

---

## 📱 Responsive Design

### Breakpoints
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

### Mobile Optimizations
- Touch-friendly buttons
- Collapsible sidebars
- Responsive grid layouts
- Optimized font sizes
- Swipe gestures support

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] User registration
- [ ] User login
- [ ] Token persistence
- [ ] Logout functionality
- [ ] Protected route access

**Chat Features:**
- [ ] Send message
- [ ] Receive response
- [ ] Language detection
- [ ] Translation accuracy
- [ ] Emergency detection

**Symptom Analysis:**
- [ ] Trigger symptom cards
- [ ] Answer questions
- [ ] Receive diagnosis
- [ ] View urgency levels
- [ ] Get doctor recommendations

**Voice Assistant:**
- [ ] Speech-to-text
- [ ] Text-to-speech
- [ ] Multi-language voice
- [ ] Microphone permissions

**Location Services:**
- [ ] Geolocation permission
- [ ] Doctor search
- [ ] Distance calculation
- [ ] Map navigation

**History:**
- [ ] Save conversations
- [ ] Load past chats
- [ ] View diagnosis records
- [ ] Session management

---

## 🚨 Emergency Detection

### Trigger Keywords
System automatically detects critical conditions:
- Chest pain / Heart attack
- Stroke symptoms
- Severe bleeding
- Breathing difficulties
- Unconsciousness
- Seizures
- Poisoning
- Severe burns
- Head injuries
- Suicidal thoughts

### Emergency Response
1. Immediate alert display
2. Red pulsing border
3. Emergency banner
4. Direct emergency service numbers
5. Hospital recommendation
6. Flagged in database

---

## 📊 Performance Optimization

### Backend
- Database connection pooling
- API request timeout (5-15s)
- Efficient query design
- JSON response compression

### Frontend
- Lazy loading components
- Debounced input handlers
- Optimized re-renders
- CSS animations (GPU accelerated)
- Image optimization

---

## 🔄 Scalability Considerations

### Database
- SQLite for development
- Upgrade to PostgreSQL for production
- Add database indexing
- Implement caching (Redis)

### API Rate Limiting
- Implement rate limiting middleware
- Queue system for heavy requests
- Load balancing for multiple instances

### File Storage
- Move to cloud storage (AWS S3)
- CDN for static assets
- Image compression

---

## 🐛 Troubleshooting

### Common Issues

**1. "Token is missing" Error**
- Solution: Login again, check localStorage

**2. "CORS Error"**
- Solution: Verify Flask CORS configuration matches frontend URL

**3. "Google Maps API Error"**
- Solution: Check API key, enable Places API in Google Cloud Console

**4. "Translation Failed"**
- Solution: Check internet connection, deep-translator requires online access

**5. "Voice not working"**
- Solution: Use HTTPS or localhost, check browser permissions

---

## 📈 Future Enhancements

1. **AI Improvements**
   - Fine-tuned medical model
   - Image-based diagnosis (skin conditions)
   - Symptom prediction

2. **Integration**
   - Electronic Health Records (EHR)
   - Pharmacy integration
   - Lab test booking
   - Telemedicine video calls

3. **Features**
   - Medication reminders
   - Health tracking dashboard
   - Family account management
   - Insurance integration

4. **Analytics**
   - User behavior tracking
   - Diagnosis accuracy metrics
   - Popular symptoms analysis

---

## 📄 License & Disclaimer

### Medical Disclaimer
This application is for educational and informational purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical concerns.

### Emergency Notice
In case of medical emergency, call:
- USA: 911
- India: 108
- UK: 999

---

## 👥 Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Verify all API keys are configured

---

## 📝 Version History

**v2.0.0 (Current)**
- Complete system overhaul
- All 10 features implemented
- Production-ready architecture
- Comprehensive documentation

**v1.0.0**
- Basic chatbot functionality
- Simple symptom collection
- Static responses

---

## 🎯 Quick Start Commands

```bash
# Backend
cd d:\PJ1
pip install -r requirements_final.txt
python app_final.py

# Frontend (new terminal)
npm install
npm run dev

# Access
http://localhost:5173 (Frontend)
http://localhost:5000 (Backend API)
```

---

**Built with ❤️ for better healthcare accessibility**
