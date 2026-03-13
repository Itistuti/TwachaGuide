import React, { useEffect, useState, useRef } from "react";
import "./DermatologistDashboard.css";

const API = "http://127.0.0.1:8000";

function DermatologistDashboard({ setLoggedIn, userEmail }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [showPatients, setShowPatients] = useState(false);
  const [showInbox, setShowInbox] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);

  const pollRef = useRef(null);
  const selectedPatientRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Token ${token}` } : {};
  };

  // Build contact list from messages — group by the other user
  const getContacts = () => {
    const contactMap = {};
    messages.forEach(msg => {
      const otherEmail = msg.isFromMe ? msg.recipient_email : msg.email;
      if (!otherEmail || otherEmail === userEmail) return;
      if (!contactMap[otherEmail]) {
        contactMap[otherEmail] = {
          email: otherEmail,
          name: msg.isFromMe ? otherEmail.split('@')[0] : msg.username,
          lastMessage: msg.message,
          lastTime: msg.timestamp,
          address: ''
        };
      } else {
        contactMap[otherEmail].lastMessage = msg.message;
        contactMap[otherEmail].lastTime = msg.timestamp;
      }
    });
    // Enrich with patient profile data
    Object.values(contactMap).forEach(contact => {
      const patient = patients.find(p => p.email === contact.email);
      if (patient) {
        contact.name = patient.name || contact.name;
        contact.address = patient.address || '';
      }
    });
    return Object.values(contactMap);
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API}/api/messages/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  useEffect(() => {
    loadPatients();
    loadMessages();
    loadDoctorProfile();
    const interval = setInterval(() => { loadPatients(); loadMessages(); }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      selectedPatientRef.current = selectedPatient;
      loadConversation();
    } else {
      selectedPatientRef.current = null;
    }
  }, [selectedPatient]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (selectedPatientRef.current) {
        loadConversation();
      }
    }, 2000);
    return () => { clearInterval(pollRef.current); pollRef.current = null; };
  }, []);

  useEffect(() => {
    const refreshActiveChat = () => {
      loadMessages();
      if (selectedPatientRef.current) {
        loadConversation();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshActiveChat();
      }
    };

    window.addEventListener('focus', refreshActiveChat);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', refreshActiveChat);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const sendMessage = async () => {
    if (message.trim() === "") return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/send_message/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({
          message: message
        })
      });

      if (res.ok) {
        setMessage("");
        loadMessages();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || 'Failed to send message'}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message: " + error.message);
    }
    setLoading(false);
  };

  const loadPatients = async () => {
    try {
      const response = await fetch(`${API}/api/patients/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadDoctorProfile = async () => {
    try {
      const res = await fetch(`${API}/profile/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.role && data.role !== 'dermatologist') {
          alert('Session role mismatch. Please log in as a dermatologist.');
          setLoggedIn(false);
          return;
        }
        setDoctorProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    if (!selectedPatient) return;
    try {
      const response = await fetch(`${API}/api/chat_history/?with=${selectedPatient.email}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setConversationMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendConversationMessage = async (e) => {
    e.preventDefault();
    const messageContent = message.trim();
    if (!messageContent || !selectedPatient) return;

    // Optimistic update — show message immediately
    const optimisticMsg = {
      isFromMe: true,
      message: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender_email: null,
      username: 'You'
    };
    setConversationMessages(prev => [...prev, optimisticMsg]);
    setMessage('');
    setTimeout(scrollToBottom, 50);

    try {
      const response = await fetch(`${API}/api/send_message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          message: messageContent,
          recipient_email: selectedPatient.email
        })
      });

      if (response.ok) {
        await loadConversation();
      } else {
        setConversationMessages(prev => prev.filter(m => m !== optimisticMsg));
        setMessage(messageContent);
        const err = await response.json();
        alert('Error: ' + (err.error || err.detail || 'Unknown error'));
      }
    } catch (error) {
      setConversationMessages(prev => prev.filter(m => m !== optimisticMsg));
      setMessage(messageContent);
      console.error('Error sending message:', error);
    }
  };

  const logout = async () => {
    await fetch(`${API}/logout/`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    localStorage.removeItem('authToken');
    setLoggedIn(false);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h2>TwachaGuide - Dermatologist Dashboard</h2>
        </div>
        <div className="header-right">
          <span className="user-info">Dr. {userEmail}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Options</h3>
            <ul>
              <li><button className="nav-btn" onClick={() => { setShowInbox(true); setShowProfile(false); setSelectedPatient(null); }}>Messages</button></li>
              <li><button className="nav-btn" onClick={() => { setShowProfile(true); setShowInbox(false); setSelectedPatient(null); }}>My Profile</button></li>
            </ul>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="consultation-area">
          {selectedPatient ? (
            // Direct Chat View with Patient
            <div className="chat-view">
              <div className="consultation-header">
                <button className="back-btn" onClick={() => setSelectedPatient(null)}>← Back to Patients</button>
                <div className="doc-header">
                  <h3>{selectedPatient.name || selectedPatient.email}</h3>
                  <p className="doc-info">{selectedPatient.email} — {selectedPatient.address || 'No address provided'}</p>
                </div>
              </div>

              <div className="consultation-messages">
                {conversationMessages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  conversationMessages.map((msg, i) => {
                    const isMine = msg.isFromMe === true;
                    return (
                      <div key={i} className={isMine ? 'chat-msg chat-msg-sent' : 'chat-msg chat-msg-received'}>
                        <div className="chat-msg-sender">
                          {!isMine && (msg.username || selectedPatient.name || selectedPatient.email.split('@')[0])}
                        </div>
                        <div className="chat-msg-text">{msg.message}</div>
                        <span className="chat-msg-time">
                          {msg.timestamp || new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="response-area" onSubmit={sendConversationMessage}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide professional skincare advice..."
                  className="response-input"
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={loading || message.trim() === ""}
                >
                  {loading ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          ) : showProfile ? (
            // Doctor Profile View
            <div className="patients-view">
              <div className="consultation-header">
                <h3>My Profile</h3>
                <p>Your professional information</p>
              </div>
              <div className="profile-content">
                {doctorProfile ? (
                  <div className="doctor-profile-card">
                    <div className="profile-avatar">{(doctorProfile.name || doctorProfile.email)[0].toUpperCase()}</div>
                    <h3 className="profile-name">Dr. {doctorProfile.name || doctorProfile.email.split('@')[0]}</h3>
                    <span className="profile-role">Dermatologist</span>
                    <div className="profile-details-list">
                      <div className="detail-row">
                        <span className="detail-label">Email</span>
                        <span className="detail-value">{doctorProfile.email}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Name</span>
                        <span className="detail-value">{doctorProfile.name || 'Not provided'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Address</span>
                        <span className="detail-value">{doctorProfile.address || 'Not provided'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Total Patients</span>
                        <span className="detail-value">{patients.length}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-messages"><p>Loading profile...</p></div>
                )}
              </div>
            </div>
          ) : (
            // Messages — Contact List View
            <div className="patients-view">
              <div className="consultation-header">
                <h3>Messages</h3>
                <p>Customers you are communicating with</p>
              </div>
              <div className="contacts-list">
                {getContacts().length === 0 ? (
                  <div className="no-messages">
                    <p>No conversations yet. Patients will appear here once they message you.</p>
                  </div>
                ) : (
                  getContacts().map((contact, i) => (
                    <div
                      key={i}
                      className="contact-card"
                      onClick={() => {
                        const patient = patients.find(p => p.email === contact.email);
                        setSelectedPatient(patient || { email: contact.email, name: contact.name, address: contact.address });
                      }}
                    >
                      <div className="contact-avatar">{(contact.name || contact.email)[0].toUpperCase()}</div>
                      <div className="contact-info">
                        <div className="contact-name">{contact.name}</div>
                        <div className="contact-email">{contact.email}</div>
                        <div className="contact-last-msg">{contact.lastMessage}</div>
                      </div>
                      <div className="contact-time">{contact.lastTime}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Panel - Patient Stats */}
        <aside className="right-panel">
          <div className="panel-card">
            <h4>📊 Today's Stats</h4>
            <div className="stat-item">
              <span>Total Patients</span>
              <strong>{patients.length}</strong>
            </div>
            <div className="stat-item">
              <span>Active Conversations</span>
              <strong>{selectedPatient ? 1 : 0}</strong>
            </div>
            <div className="stat-item">
              <span>Messages Today</span>
              <strong>{conversationMessages.length}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DermatologistDashboard;
