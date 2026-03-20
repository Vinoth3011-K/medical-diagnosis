import { useState, useEffect } from 'react';
import './SymptomCards.css';

export default function SymptomCards({ onComplete }) {
  const [flow, setFlow] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showFollowup, setShowFollowup] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/symptom-flow?message=${encodeURIComponent(window.lastUserMessage || '')}`)
      .then(r => r.json())
      .then(data => setFlow(data.flow));
  }, []);

  const handleAnswer = (id, value) => {
    const newAnswers = { ...answers, [id]: value };
    setAnswers(newAnswers);

    const current = flow[currentIndex];
    if (current.followup && current.followup[value]) {
      setShowFollowup(true);
    } else {
      next();
    }
  };

  const handleFollowup = (value) => {
    const current = flow[currentIndex];
    setAnswers({ ...answers, [`${current.id}_followup`]: value });
    setShowFollowup(false);
    next();
  };

  const next = () => {
    if (currentIndex < flow.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submit();
    }
  };

  const submit = async () => {
    const res = await fetch('http://localhost:5000/api/symptom-collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    const data = await res.json();
    setResult(data);
    onComplete && onComplete(data);
  };

  if (result) {
    return (
      <div className="result-card">
        <h2>Assessment</h2>
        <div className={`urgency ${result.urgency}`}>{result.urgency.toUpperCase()}</div>
        <div className="summary">
          {result.summary.map((s, i) => <div key={i}>• {s}</div>)}
        </div>
        <p>{result.assessment}</p>
        <div className="recommendation">💡 {result.recommendation}</div>
      </div>
    );
  }

  if (!flow.length) return <div>Loading...</div>;

  const current = flow[currentIndex];
  const followup = showFollowup && current.followup[answers[current.id]];

  return (
    <div className="symptom-cards">
      <div className="progress">{currentIndex + 1} / {flow.length}</div>
      
      <div className="card">
        <h3>{followup ? followup.question : current.question}</h3>
        
        {!followup && current.type === 'yesno' && (
          <div className="buttons">
            <button onClick={() => handleAnswer(current.id, 'yes')}>Yes</button>
            <button onClick={() => handleAnswer(current.id, 'no')}>No</button>
          </div>
        )}

        {!followup && current.type === 'choice' && (
          <div className="options">
            {current.options.map(opt => (
              <button key={opt} onClick={() => handleAnswer(current.id, opt)}>{opt}</button>
            ))}
          </div>
        )}

        {!followup && current.type === 'multichoice' && (
          <div className="multi">
            {current.options.map(opt => (
              <label key={opt}>
                <input type="checkbox" onChange={(e) => {
                  const selected = answers[current.id] || [];
                  setAnswers({
                    ...answers,
                    [current.id]: e.target.checked 
                      ? [...selected, opt] 
                      : selected.filter(s => s !== opt)
                  });
                }} />
                {opt}
              </label>
            ))}
            <button onClick={next}>Next</button>
          </div>
        )}

        {followup && followup.type === 'choice' && (
          <div className="options">
            {followup.options.map(opt => (
              <button key={opt} onClick={() => handleFollowup(opt)}>{opt}</button>
            ))}
          </div>
        )}

        {followup && followup.type === 'multichoice' && (
          <div className="multi">
            {followup.options.map(opt => (
              <label key={opt}>
                <input type="checkbox" onChange={(e) => {
                  const selected = answers[`${current.id}_followup`] || [];
                  setAnswers({
                    ...answers,
                    [`${current.id}_followup`]: e.target.checked 
                      ? [...selected, opt] 
                      : selected.filter(s => s !== opt)
                  });
                }} />
                {opt}
              </label>
            ))}
            <button onClick={() => { setShowFollowup(false); next(); }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
