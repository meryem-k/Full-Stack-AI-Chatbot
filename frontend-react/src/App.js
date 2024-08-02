import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid';

const App = () => {
  const [question, setQuestion] = useState('');
  const [sessionId, setSessionId] = useState(uuidv4());
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      setMessages([
        { user: '', bot: 'Hello, welcome to our furniture store. My name is Eve and I am your customer representative. Please let me know how I can help you?' },
        { user: '', bot: '', options: ['Product Information', 'Submit a Ticket for Damaged Product'] }
      ]);
    }
  }, [chatOpen, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleOptionClick = async (option) => {
    setMessages((prevMessages) => [...prevMessages, { user: option, bot: '' }]);
    if (option === 'Product Information') {
      const res = await fetch('http://localhost:4000/api/product-information', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      setMessages((prevMessages) => [...prevMessages, { user: '', bot: data.response }]);
    } else if (option === 'Submit a Ticket for Damaged Product') {
      const res = await fetch('http://localhost:4000/api/initial-ticket-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
  
      const data = await res.json();
      console.log('Initial ticket request response:', data);
      setMessages((prevMessages) => [...prevMessages, { user: '', bot: data.response }]);
      setShowTicketForm(true);
    } else {
      setMessages((prevMessages) => [...prevMessages, { user: '', bot: `Option "${option}" selected. Feature to be implemented.` }]);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (question.trim()) {
      const userMessage = { user: question, bot: '' };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setQuestion('');

      const res = await fetch('http://localhost:4000/api/product-information-followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, sessionId }),
      });

      const data = await res.json();
      setMessages((prevMessages) => [...prevMessages, { user: '', bot: data.response }]);
    } else {
      alert('Please enter a question.');
    }
    setIsSubmitting(false);
  };

  const handleTicketSubmission = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('orderNumber', orderNumber);
    formData.append('issueDescription', issueDescription);
    formData.append('sessionId', sessionId);
    if (photo) {
      formData.append('photo', photo);
    }

    const res = await fetch('http://localhost:4000/api/submit-ticket', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.error) {
      setMessages((prevMessages) => [...prevMessages, { user: '', bot: data.error }]);
    } else {
      setMessages((prevMessages) => [...prevMessages, { user: '', bot: data.response }]);
      setShowTicketForm(false);
      setShowAdditionalForm(true);
    }

    setOrderNumber('');
    setIssueDescription('');
    setPhoto(null);
    setPhotoPreview(null);
    setIsSubmitting(false);
  };

  const handleAdditionalInfoSubmission = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('answer', question);
    if (photo) {
      formData.append('additionalPhoto', photo);
    }

    const res = await fetch('http://localhost:4000/api/submit-additional-info', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.error) {
      setMessages((prevMessages) => [...prevMessages, { user: '', bot: data.error }]);
    } else {
      setMessages((prevMessages) => [...prevMessages, { user: question, bot: data.response }]);
      setShowAdditionalForm(true);
      setQuestion('');
      setPhoto(null);
      setPhotoPreview(null);
    }
    setIsSubmitting(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  const handleEndSession = () => {
    setSessionId(uuidv4());
    setMessages([]);
    setChatOpen(false);
    setQuestion(''); 
  };

  const handleClickOutside = (e) => {
    if (chatWindowRef.current && !chatWindowRef.current.contains(e.target)) {
      setChatOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="App">
      <div className={`chat-bubble ${chatOpen ? 'open' : ''}`} onClick={toggleChat}>
        <span role="img" aria-label="chat icon" className="bubble-icon">💬</span>
      </div>
      {chatOpen && (
        <div className="chat-window" ref={chatWindowRef}>
          <div className="chat-header">
            <span>Furniture Store Assistant</span>
            <button className="close-btn" onClick={toggleChat}>×</button>
          </div>
          <div className="chat-body">
            {messages.map((msg, index) => (
              <div key={index} className="chat-message">
                {msg.user && <div className="user-message">{msg.user}</div>}
                {msg.bot && <div className="bot-response">{msg.bot}</div>}
                {msg.options && (
                  <div className="options">
                    {msg.options.map((option, i) => (
                      <button key={i} onClick={() => handleOptionClick(option)} className="option-button">
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {showTicketForm && (
            <form onSubmit={handleTicketSubmission} className="chat-form">
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Order Number"
                className="chat-input"
                required
              />
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Issue Description"
                className="chat-input"
                required
              />
              <input
                type="file"
                onChange={handlePhotoChange}
                className="chat-input"
                accept="image/*"
              />
              {photoPreview && <img src={photoPreview} alt="Preview" className="photo-preview" />}
              <button type="submit" className="chat-submit" disabled={isSubmitting}>Submit Ticket</button>
            </form>
          )}
          {showAdditionalForm && (
            <form onSubmit={handleAdditionalInfoSubmission} className="chat-form">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your answer here"
                className="chat-input"
              />
              <input
                type="file"
                name="additionalPhoto"
                onChange={handlePhotoChange}
                className="chat-input"
                accept="image/*"
              />
              {photoPreview && <img src={photoPreview} alt="Preview" className="photo-preview" />}
              <button type="submit" className="chat-submit" disabled={isSubmitting}>Send</button>
            </form>
          )}
          {!showTicketForm && !showAdditionalForm && (
            <form onSubmit={handleSubmit} className="chat-form">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your message"
                className="chat-input"
              />
              <button type="submit" className="chat-submit" disabled={isSubmitting}>Send</button>
            </form>
          )}
          <button onClick={handleEndSession} className="end-session-btn">Close Session</button>
        </div>
      )}
    </div>
  );
};

export default App;
