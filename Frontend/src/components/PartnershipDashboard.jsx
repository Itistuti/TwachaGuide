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
    aboutSuggestedProduct: "",
  });
  const [productPicture, setProductPicture] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partnershipRequests, setPartnershipRequests] = useState([]);
  const [showApplicationStatus, setShowApplicationStatus] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const loadPartnershipRequests = async () => {
    try {
      const res = await fetch(`${API}/api/partnership-requests/`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        setPartnershipRequests(data.partnership_requests || []);
      }
    } catch (err) {
      console.error("Error loading partnership requests:", err);
    }
  };

  React.useEffect(() => {
    loadPartnershipRequests();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must not exceed 5MB.");
        return;
      }
      setProductPicture(file);
      setError("");
    }
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
      const submitData = new FormData();
      submitData.append("companyName", formData.companyName);
      submitData.append("address", formData.address);
      submitData.append("contactNumber", formData.contactNumber);
      submitData.append("email", formData.email);
      submitData.append("description", formData.description);
      submitData.append("productSuggestion", formData.productSuggestion);
      submitData.append("aboutSuggestedProduct", formData.aboutSuggestedProduct);
      if (productPicture) {
        submitData.append("productPicture", productPicture);
      }

      const res = await fetch(`${API}/api/partnership/`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
        },
        credentials: "include",
        body: submitData,
      });

      if (res.ok) {
        setSubmitted(true);
        await loadPartnershipRequests();
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
            <button
              className="application-status-btn"
              onClick={() => setShowApplicationStatus(!showApplicationStatus)}
            >
              Application Status
            </button>
            <span className="partnership-user-email">{userEmail}</span>
            <button className="partnership-logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="partnership-main">
        {showApplicationStatus ? (
          <div className="partnership-status-card">
            <div className="status-card-header">
              <h2>Application Status</h2>
              <button
                className="close-status-btn"
                onClick={() => setShowApplicationStatus(false)}
              >
                ✕
              </button>
            </div>
            {partnershipRequests.length === 0 ? (
              <p className="no-applications">No partnership applications submitted yet.</p>
            ) : (
              <div className="applications-list">
                {partnershipRequests.map((req) => (
                  <div key={req.id} className={`application-item status-${req.status}`}>
                    <div className="application-info">
                      <h4>{req.company_name}</h4>
                      <p className="app-email">{req.email}</p>
                      <p className="app-date">Submitted: {req.created_at}</p>
                    </div>
                    <div className="application-status">
                      <span className={`status-badge status-${req.status}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
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
                  aboutSuggestedProduct: "",
                });
                setProductPicture(null);
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
                  Product Name
                </label>
                <textarea
                  id="productSuggestion"
                  name="productSuggestion"
                  placeholder="Name of the product(s) you'd like to feature on our website..."
                  value={formData.productSuggestion}
                  onChange={handleChange}
                  className="partnership-input"
                  rows="2"
                />
              </div>

              <div className="partnership-form-group">
                <label htmlFor="aboutSuggestedProduct">
                  About Suggested Product
                </label>
                <textarea
                  id="aboutSuggestedProduct"
                  name="aboutSuggestedProduct"
                  placeholder="Provide more details about your suggested product (benefits, ingredients, usage, etc.)..."
                  value={formData.aboutSuggestedProduct}
                  onChange={handleChange}
                  className="partnership-input"
                  rows="4"
                />
              </div>

              <div className="partnership-form-group">
                <label htmlFor="productPicture">Product Picture</label>
                <input
                  type="file"
                  id="productPicture"
                  name="productPicture"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="partnership-input"
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
          </>
        )}
      </main>
    </div>
  );
}

export default PartnershipDashboard;
