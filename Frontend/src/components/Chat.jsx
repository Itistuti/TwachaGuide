import React, { useEffect, useState } from "react";
import "./Chat.css";

const API = "http://127.0.0.1:8000";

function Chat({ setLoggedIn }) {

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const loadMessages = async () => {

    const res = await fetch(`${API}/api/messages/`, {
      credentials: "include"
    });

    if(res.ok){
      const data = await res.json();
      setMessages(data.messages);
    }
  };

  useEffect(()=>{
    loadMessages();
    const interval = setInterval(loadMessages,2000);
    return ()=>clearInterval(interval);
  },[]);


  const sendMessage = async () => {

    if(message.trim()==="") return;

    const res = await fetch(`${API}/api/send_message/`, {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      credentials:"include",
      body: JSON.stringify({
        message: message
      })
    });

    if(res.ok){
      setMessage("");
      loadMessages();
    }
  };


  const logout = async () => {

    await fetch(`${API}/logout/`,{
      method:"POST",
      credentials:"include"
    });

    setLoggedIn(false);
  };

  return (

    <div className="chat-page">
    <div className="chat-container">

      <div className="chat-header">
        <div className="header-left">
          <h3>TwachaGuide Chat</h3>
          <p>Connect with Skin Professionals</p>
        </div>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="chat-box">

        {messages.map((msg,i)=>(
          <div key={i} className={`message-wrapper ${msg.isFromMe ? 'sent' : 'received'}`}>
            <div className={`message-bubble ${msg.isFromMe ? 'bubble-sent' : 'bubble-received'}`}>
              {!msg.isFromMe && (
                <span className="bubble-username">{msg.username}</span>
              )}
              <p className="bubble-text">{msg.message}</p>
              <span className="bubble-time">{msg.timestamp}</span>
            </div>
          </div>
        ))}

      </div>

      <div className="chat-input">

        <input
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          placeholder="Ask a question or type your message..."
          className="message-input"
        />

        <button className="send-btn" onClick={sendMessage}>Send</button>

      </div>

    </div>
    </div>

  );
}

export default Chat;