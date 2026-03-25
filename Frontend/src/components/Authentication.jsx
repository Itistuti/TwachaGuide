import React, { useState } from "react";
import "./Authentication.css";

const API = "http://127.0.0.1:8000";

function Authentication({ setLoggedIn, setCurrentPage, setUserRole, setUserEmail, initialMode, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("customer");
  const [nmcCertificate, setNmcCertificate] = useState(null);
  const [panCard, setPanCard] = useState(null);
  const [partnerPanCard, setPartnerPanCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    setLoading(true);

    if (!name || !email || !address || !password || !confirmPassword || !role) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (role === 'dermatologist') {
      if (!nmcCertificate || !panCard) {
        setError("NMC certificate and PAN card are required for dermatologists");
        setLoading(false);
        return;
      }
    }

    if (role === 'partner') {
      if (!partnerPanCard) {
        setError("PAN card is required for partners");
        setLoading(false);
        return;
      }
    }

    try {
      console.log("Registering with:", { name, email, address, password, role });
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('address', address);
      formData.append('password', password);
      formData.append('role', role);
      if (role === 'dermatologist') {
        formData.append('nmc_certificate', nmcCertificate);
        formData.append('pan_card', panCard);
      }
      if (role === 'partner') {
        formData.append('partner_pan_card', partnerPanCard);
      }

      const res = await fetch(`${API}/register/`, {
        method: "POST",
        body: formData
      });

      console.log("Registration response status:", res.status, res.statusText);
      
      const data = await res.json();
      console.log("Registration response data:", data);

      if (res.ok || res.status === 201) {
        setError("");
        if (onAuthSuccess) {
          onAuthSuccess("Registration successful! Please log in.");
        }
        setName("");
        setEmail("");
        setAddress("");
        setPassword("");
        setConfirmPassword("");
        setNmcCertificate(null);
        setPanCard(null);
        setPartnerPanCard(null);
        setIsLogin(true);
      } else {
        setError(data.error || `Registration failed: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Register error details:", error);
      setError("Failed to connect to server. Make sure the backend is running on http://localhost:8000");
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      console.log("Logging in with email:", email);
      const res = await fetch(`${API}/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      console.log("Login response status:", res.status, res.statusText);
      const data = await res.json();
      console.log("Login response data:", data);

      if (res.ok || res.status === 200) {
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        setUserEmail(data.email);
        setUserRole(data.role);
        if (onAuthSuccess) {
          onAuthSuccess("Login successful!");
        }
        setLoggedIn(true);
      } else {
        setError(data.error || `Login failed: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Login error details:", error);
      setError("Failed to connect to server. Make sure the backend is running on http://localhost:8000");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <button 
        className="back-button"
        onClick={() => setCurrentPage('home')}
      >
        ← Back to Home
      </button>

      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <h2 className="auth-title">
            {isLogin ? 'Welcome Back' : 'Join TwachaGuide'}
          </h2>
          <p className="auth-subtitle">
            {isLogin ? 'Login to your account' : 'Create your TwachaGuide account'}
          </p>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Registration - Role Selection */}
        {!isLogin && (
          <div className="form-group">
            <label>I am a:</label>
            <div className="role-selector">
              <div className="role-option">
                <input
                  type="radio"
                  id="customer"
                  name="role"
                  value="customer"
                  checked={role === "customer"}
                  onChange={(e) => setRole(e.target.value)}
                />
                <label htmlFor="customer" className="role-label">
                  <span className="role-icon"></span>
                  <div>
                    <div className="role-name">Customer</div>
                    <div className="role-desc">Get skincare advice</div>
                  </div>
                </label>
              </div>

              <div className="role-option">
                <input
                  type="radio"
                  id="dermatologist"
                  name="role"
                  value="dermatologist"
                  checked={role === "dermatologist"}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setNmcCertificate(null);
                    setPanCard(null);
                    setPartnerPanCard(null);
                  }}
                />
                <label htmlFor="dermatologist" className="role-label">
                  <span className="role-icon"></span>
                  <div>
                    <div className="role-name">Dermatologist</div>
                    <div className="role-desc">Provide professional advice</div>
                  </div>
                </label>
              </div>

              <div className="role-option">
                <input
                  type="radio"
                  id="partner"
                  name="role"
                  value="partner"
                  checked={role === "partner"}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setPartnerPanCard(null);
                  }}
                />
                <label htmlFor="partner" className="role-label">
                  <span className="role-icon"></span>
                  <div>
                    <div className="role-name">Partner</div>
                    <div className="role-desc">Partner with us as a brand</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Full Name Input - Registration Only */}
        {!isLogin && (
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>
        )}

        {/* Email Input */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Address Input - Registration Only */}
        {!isLogin && (
          <div className="form-group">
            <label>Address</label>
            <textarea
              placeholder="Enter your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-input"
              rows="2"
            />
          </div>
        )}

        {!isLogin && role === 'dermatologist' && (
          <>
            <div className="form-group">
              <label>NMC Certificate (Photo)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNmcCertificate(e.target.files[0] || null)}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>PAN Card (Photo)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPanCard(e.target.files[0] || null)}
                className="form-input"
                required
              />
            </div>
          </>
        )}

        {!isLogin && role === 'partner' && (
          <div className="form-group">
            <label>PAN Card (Photo)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPartnerPanCard(e.target.files[0] || null)}
              className="form-input"
              required
            />
          </div>
        )}

        {/* Password Input */}
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Confirm Password Input - Registration Only */}
        {!isLogin && (
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
            />
          </div>
        )}

        {/* Submit Button */}
        <button 
          className={`btn-submit ${loading ? 'loading' : ''}`}
          onClick={isLogin ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
        </button>

        {/* Toggle Auth Mode */}
        <div className="auth-toggle">
          <p>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button 
              className="toggle-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setName("");
                setEmail("");
                setAddress("");
                setPassword("");
                setConfirmPassword("");
                setError("");
                setRole("customer");
                setNmcCertificate(null);
                setPanCard(null);
                setPartnerPanCard(null);
              }}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Authentication;
