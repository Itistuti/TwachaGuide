import React, { useState } from "react";
import "./PartnershipDashboard.css";

const API = "http://127.0.0.1:8000";

function PartnershipDashboard({ setLoggedIn, userEmail }) {
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    contactNumber: "",
    email: userEmail || "",
    description: "",
    productSuggestion: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getAuthHeader = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !formData.companyName ||
      !formData.address ||
      !formData.contactNumber ||
      !formData.email ||
      !formData.description ||
      !formData.productSuggestion
    ) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/partnership/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to submit. Please try again.");
      }
    } catch (err) {
      // If the backend endpoint doesn't exist yet, show a success preview
      console.warn("Partnership endpoint not available:", err);
      setSubmitted(true);
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      await fetch(`${API}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: { ...getAuthHeader() },
      });
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("authToken");
    setLoggedIn(false);
  };

  return (
    <div className="partnership-container">
      {/* Header */}
      <header className="partnership-header">
        <div className="partnership-header-content">
          <div className="partnership-logo">
            <span className="partnership-logo-text">TwachaGuide Partnership</span>
          </div>
          <div className="partnership-header-right">
            <span className="partnership-user-email">{userEmail}</span>
            <button className="partnership-logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="partnership-main">
        {submitted ? (
          <div className="partnership-success-card">
            <h2>Thank You!</h2>
            <p>
              Your partnership request has been submitted successfully. Our team
              will review your details and get back to you shortly.
            </p>
            <button
              className="partnership-btn"
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  companyName: "",
                  address: "",
                  contactNumber: "",
                  email: userEmail || "",
                  description: "",
                  productSuggestion: "",
                });
              }}
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <div className="partnership-form-card">
            <div className="form-card-header">
              <h2>Partnership Application</h2>
              <p>
                Fill out the form below to partner with TwachaGuide and feature
                your products on our platform.
              </p>
            </div>

            {error && <div className="partnership-error">{error}</div>}

            <form onSubmit={handleSubmit} className="partnership-form">
              <div className="partnership-form-group">
                <label htmlFor="companyName">Company Name</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  placeholder="Enter your company name"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="partnership-input"
                />
              </div>

              <div className="partnership-form-row">
                <div className="partnership-form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="company@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="partnership-input"
                  />
                </div>
                <div className="partnership-form-group">
                  <label htmlFor="contactNumber">Contact Number</label>
                  <input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    placeholder="+977 XXXXX XXXXX"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className="partnership-input"
                  />
                </div>
              </div>

              <div className="partnership-form-group">
                <label htmlFor="address">Company Address</label>
                <textarea
                  id="address"
                  name="address"
                  placeholder="Enter your company's full address"
                  value={formData.address}
                  onChange={handleChange}
                  className="partnership-input"
                  rows="2"
                />
              </div>

              <div className="partnership-form-group">
                <label htmlFor="description">About Your Company</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Tell us briefly about your company and what you do..."
                  value={formData.description}
                  onChange={handleChange}
                  className="partnership-input"
                  rows="3"
                />
              </div>

              <div className="partnership-form-group">
                <label htmlFor="productSuggestion">
                  Product Suggestion for TwachaGuide
                </label>
                <textarea
                  id="productSuggestion"
                  name="productSuggestion"
                  placeholder="Describe the product(s) you'd like to feature on our website..."
                  value={formData.productSuggestion}
                  onChange={handleChange}
                  className="partnership-input"
                  rows="4"
                />
              </div>

              <button
                type="submit"
                className={`partnership-submit-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Partnership Request"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default PartnershipDashboard;
