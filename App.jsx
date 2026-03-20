import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'
import SymptomCards from './SymptomCards'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showSymptomCards, setShowSymptomCards] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showHome, setShowHome] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!showHome) {
      addMessage('bot', 'Hello! I\'m your medical diagnosis assistant. How can I help you today?')
    }
  }, [showHome])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (sender, text, data = null) => {
    setMessages(prev => [...prev, { sender, text, data, timestamp: new Date() }])
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

  const handleSymptomComplete = (result) => {
    addMessage('bot', result.assessment, result)
    setShowSymptomCards(false)
  }

  return (
    <div className="app">
      {showHome ? (
        <div className="home-screen">
          <div className="home-content">
            <img src="https://img.freepik.com/premium-vector/health-care-medical-logo-vector-design_990473-2554.jpg" alt="Logo" className="home-logo" />
            <h1>Medical Diagnosis Assistant</h1>
            <p>AI-Powered Health Consultation Available 24/7</p>
            <div className="features">
              <div className="feature">
                <span className="feature-icon">🩺</span>
                <h3>Symptom Analysis</h3>
                <p>Get instant health assessments</p>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <h3>Quick Response</h3>
                <p>AI-powered diagnosis in seconds</p>
              </div>
              <div className="feature">
                <span className="feature-icon">🔒</span>
                <h3>Confidential</h3>
                <p>Your health data is secure</p>
              </div>
            </div>
            <button className="start-btn" onClick={() => setShowHome(false)}>
              Start Consultation
            </button>
          </div>
        </div>
      ) : (
      <div className="chat-container">
        <div className="chat-header">
          <img src="https://img.freepik.com/premium-vector/health-care-medical-logo-vector-design_990473-2554.jpg" alt="Logo" className="logo" />
          <div className="title-section">
            <h1>Medical Diagnosis Assistant</h1>
            <p>AI-Powered Health Consultation • Available 24/7</p>
          </div>
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

        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
      )}
    </div>
  )
}

export default App
