import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './ChatBot.css'
import SymptomCards from './SymptomCards'

function ChatBot({ onLogout }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showSymptomCards, setShowSymptomCards] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [showDoctors, setShowDoctors] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsRecording(false)
      }

      recognitionRef.current.onerror = () => {
        setIsRecording(false)
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }
  }, [])

  useEffect(() => {
    addMessage('bot', 'Hello! I\'m your medical diagnosis assistant. How can I help you today?')
    getUserLocation()
  }, [])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          console.log('Location detected:', position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.log('Location error:', error)
          addMessage('bot', '📍 Location access denied. Doctor recommendations will be limited.')
        }
      )
    } else {
      addMessage('bot', '📍 Location not supported by your browser.')
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (sender, text, data = null) => {
    setMessages(prev => [...prev, { sender, text, data, timestamp: new Date() }])
    
    // Auto-speak bot messages only if voice mode is ON
    if (sender === 'bot' && voiceMode) {
      speakText(text)
    }
  }

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      synthRef.current.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      synthRef.current.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true)
      recognitionRef.current.start()
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    addMessage('user', input)
    setInput('')
    setIsLoading(true)

    try {
      const response = await axios.post('/api/chat', { message: input })
      
      setIsLoading(false)
      
      // Check if API wants to trigger symptom cards
      if (response.data.trigger_cards) {
        window.lastUserMessage = input
        setShowSymptomCards(true)
      } else {
        addMessage('bot', response.data.response)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setIsLoading(false)
      addMessage('bot', 'Error: Please make sure Flask is running on port 5000')
    }
  }

  const handleSymptomComplete = async (result) => {
    setShowSymptomCards(false)
    setIsLoading(true)

    try {
      console.log('Symptom answers:', result)
      
      const response = await axios.post('/api/symptom-analyze', {
        answers: result,
        location: userLocation
      })

      setIsLoading(false)
      const data = response.data
      
      console.log('Analysis result:', data)

      // Build assessment message
      let assessmentText = `📋 Medical Assessment:\n\n`
      assessmentText += `Severity: ${data.severity || 'MODERATE'} (Score: ${data.severity_score || 5}/10)\n`
      assessmentText += `Urgency: ${(data.urgency || 'medium').toUpperCase()}\n\n`
      
      if (data.severity_reasoning) {
        assessmentText += `Analysis: ${data.severity_reasoning}\n\n`
      }

      if (data.conditions && data.conditions.length > 0) {
        assessmentText += `Possible Conditions:\n`
        data.conditions.forEach((c, i) => {
          assessmentText += `${i + 1}. ${c.name} (${c.probability}) - ${c.reasoning}\n`
        })
        assessmentText += `\n`
      }

      if (data.actions) {
        const actionsList = Array.isArray(data.actions) ? data.actions : Object.values(data.actions)
        if (actionsList.length > 0) {
          assessmentText += `Immediate Actions:\n`
          actionsList.forEach((a, i) => {
            const actionText = typeof a === 'string' ? a : JSON.stringify(a)
            assessmentText += `${i + 1}. ${actionText}\n`
          })
          assessmentText += `\n`
        }
      }

      if (data.home_care) {
        const homeCareList = Array.isArray(data.home_care) ? data.home_care : Object.values(data.home_care)
        if (homeCareList.length > 0) {
          assessmentText += `Home Care:\n`
          homeCareList.forEach((h, i) => {
            const careText = typeof h === 'string' ? h : JSON.stringify(h)
            assessmentText += `• ${careText}\n`
          })
          assessmentText += `\n`
        }
      }

      if (data.warning_signs) {
        const warningsList = Array.isArray(data.warning_signs) ? data.warning_signs : Object.values(data.warning_signs)
        if (warningsList.length > 0) {
          assessmentText += `⚠️ Warning Signs to Watch:\n`
          warningsList.forEach((w, i) => {
            const warningText = typeof w === 'string' ? w : JSON.stringify(w)
            assessmentText += `• ${warningText}\n`
          })
          assessmentText += `\n`
        }
      }

      if (data.specialty) {
        assessmentText += `Recommended Specialty: ${data.specialty}\n\n`
      }

      addMessage('bot', assessmentText, {
        urgency: data.urgency || 'medium',
        severity: data.severity || 'MODERATE',
        summary: data.summary || ['Symptom analysis completed'],
        assessment: data.assessment || data.severity_reasoning || 'Based on your symptoms, please monitor your condition.',
        recommendation: data.recommendation || 'Please consult a healthcare professional if symptoms persist.'
      })

      // Show doctor recommendations if urgency is medium or higher
      if (data.doctors && data.doctors.length > 0) {
        setDoctors(data.doctors)
        setShowDoctors(true)
        addMessage('bot', `🏥 Found ${data.doctors.length} nearby doctors/hospitals with 4+ star ratings.`)
      } else if (['medium', 'high', 'emergency'].includes(data.urgency) && userLocation) {
        addMessage('bot', '🔍 Searching for nearby doctors...')
        searchDoctors(data.specialty || 'hospital')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      console.error('Error details:', error.response?.data)
      setIsLoading(false)
      addMessage('bot', 'Error analyzing symptoms. Please try again or describe your symptoms in the chat.')
    }
  }

  const searchDoctors = async (specialty) => {
    if (!userLocation) {
      addMessage('bot', '📍 Please enable location access to find nearby doctors.')
      return
    }

    try {
      const response = await axios.post('/api/find-doctors', {
        location: userLocation,
        specialty: specialty
      })

      if (response.data.doctors && response.data.doctors.length > 0) {
        setDoctors(response.data.doctors)
        setShowDoctors(true)
      } else {
        addMessage('bot', '❌ No nearby doctors found. Try expanding your search radius.')
      }
    } catch (error) {
      console.error('Doctor search error:', error)
      addMessage('bot', '❌ Error finding doctors. Please try again.')
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src="https://img.freepik.com/premium-vector/health-care-medical-logo-vector-design_990473-2554.jpg" alt="Logo" className="logo" />
        <div className="title-section">
          <h1>Medical Diagnosis Assistant</h1>
          <p>Welcome to Medical Diagnosis Assistant!</p>
        </div>
        <button 
          className={`voice-mode-toggle ${voiceMode ? 'active' : ''}`}
          onClick={() => setVoiceMode(!voiceMode)}
          title={voiceMode ? 'Voice Mode ON' : 'Voice Mode OFF'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {voiceMode ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </>
            )}
          </svg>
        </button>
        <button 
          className="logout-btn"
          onClick={onLogout}
          title="Logout"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="message-content">
              {msg.sender === 'bot' && msg.text.length > 300 ? (
                <div className="info-card">
                  {msg.text.split('\n').map((line, i) => {
                    if (line.trim().match(/^\d+\./)) {
                      return <div key={i} className="info-point">{line.trim()}</div>
                    } else if (line.trim().startsWith('*')) {
                      return <div key={i} className="info-subpoint">{line.trim()}</div>
                    } else if (line.trim()) {
                      return <p key={i}>{line.trim()}</p>
                    }
                    return null
                  })}
                </div>
              ) : (
                <p>{msg.text}</p>
              )}
              {msg.data && msg.data.urgency && (
                <div className="diagnosis-result">
                  <div className="result-header">
                    <h3>Health Assessment</h3>
                    <span className={`urgency-badge ${msg.data.urgency}`}>
                      {msg.data.urgency === 'low' && '✅'}
                      {msg.data.urgency === 'medium' && '⚠️'}
                      {msg.data.urgency === 'high' && '🚨'}
                      {msg.data.urgency.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="summary-section">
                    <h4>Key Findings</h4>
                    <div className="summary-grid">
                      {msg.data.summary.map((s, i) => (
                        <div key={i} className="summary-item">
                          <span className="bullet">•</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="assessment-text">
                    <h4>Medical Assessment</h4>
                    <p>{msg.data.assessment}</p>
                  </div>
                  
                  <div className="recommendation-section">
                    <div className="recommendation-header">
                      <span className="icon">👨‍⚕️</span>
                      <h4>Recommendation</h4>
                    </div>
                    <p>{msg.data.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
            <span className="timestamp">
              {msg.timestamp.toLocaleTimeString()}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showSymptomCards && (
        <div className="modal-overlay">
          <SymptomCards onComplete={handleSymptomComplete} />
        </div>
      )}

      {showDoctors && doctors.length > 0 && (
        <div className="doctors-panel">
          <div className="doctors-header">
            <h3>🏥 Recommended Doctors & Hospitals</h3>
            <button className="close-doctors" onClick={() => setShowDoctors(false)}>×</button>
          </div>
          <div className="doctors-list">
            {doctors.map((doctor, idx) => (
              <div key={idx} className="doctor-card">
                <div className="doctor-info">
                  <h4>{doctor.name}</h4>
                  <div className="rating">
                    <span className="stars">⭐ {doctor.rating}</span>
                    <span className="reviews">({doctor.total_ratings || 0} reviews)</span>
                  </div>
                  <p className="address">📍 {doctor.address}</p>
                  <p className="distance">📍 {doctor.distance}</p>
                  {doctor.phone && doctor.phone !== 'N/A' && (
                    <p className="phone">📞 {doctor.phone}</p>
                  )}
                  {doctor.open_now !== null && (
                    <p className={`status ${doctor.open_now ? 'open' : 'closed'}`}>
                      {doctor.open_now ? '✅ Open Now' : '🔴 Closed'}
                    </p>
                  )}
                </div>
                <div className="doctor-actions">
                  {doctor.maps_url && (
                    <a href={doctor.maps_url} target="_blank" rel="noopener noreferrer" className="btn-maps">
                      🗺️ Directions
                    </a>
                  )}
                  {doctor.booking_url && (
                    <a href={doctor.booking_url} target="_blank" rel="noopener noreferrer" className="btn-book">
                      📅 Book Appointment
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="input-area">
        <button 
          className={`voice-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
          disabled={!recognitionRef.current}
        >
          {isRecording ? (
            <i className="bi bi-mic-mute"></i>
          ) : (
            <i className="bi bi-mic"></i>
          )}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isRecording ? '🎤 Listening...' : 'Type your message...'}
        />
        {isSpeaking && voiceMode && (
          <button 
            className="speaker-btn active"
            onClick={stopSpeaking}
            title="Stop Speaking"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          </button>
        )}
        <button onClick={handleSend}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ChatBot
