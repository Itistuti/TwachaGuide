import React from "react";
import "./Home.css";
import skinCareHome from "../assets/skin-care-home.jpg";

function Home({ setCurrentPage }) {
  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo">
            <span className="logo-icon"></span>
            <span className="logo-text">TwachaGuide</span>
          </div>
          <div className="nav-buttons">
            <button 
              className="nav-btn login-btn"
              onClick={() => setCurrentPage('login')}
            >
              Login
            </button>
            <button 
              className="nav-btn signup-btn"
              onClick={() => setCurrentPage('signup')}
            >
              Sign-Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to TwachaGuide</h1>
          <p className="hero-subtitle">Your Personal Skin Care Companion</p>
          <p className="hero-description">
            Connect with skin care professionals and receive personalized skincare routines 
            tailored just for you.
          </p>
          <div className="hero-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentPage('login')}
            >
              Get Started
            </button>
          </div>
        </div>
        <div className="hero-image">
          <img src={skinCareHome} alt="Skin care" className="hero-img" />
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose TwachaGuide?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Expert Professionals</h3>
            <p>Connect with certified dermatologists and skincare experts who understand your unique skin needs.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Personalized Routines</h3>
            <p>Get customized skincare routines designed specifically for your skin type and concerns.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Direct Communication</h3>
            <p>Chat directly with professionals and get answers to all your skincare questions instantly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Progress Tracking</h3>
            <p>Track your skin's progress with detailed recommendations and follow-up guidance.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Science-Based Treatment</h3>
            <p>All recommendations are based on dermatological science and proven skincare practices.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Privacy First</h3>
            <p>Your skin concerns are personal. We keep all your information secure and confidential.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create Your Profile</h3>
            <p>Sign up and tell us about your skin type, concerns, and goals.</p>
          </div>
          <div className="step-divider"></div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Connect with Professionals</h3>
            <p>Get paired with skincare experts who specialize in your specific concerns.</p>
          </div>
          <div className="step-divider"></div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Receive Custom Routine</h3>
            <p>Get a personalized skincare routine tailored to your unique needs.</p>
          </div>
          <div className="step-divider"></div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Chat & Support</h3>
            <p>Chat with professionals anytime for advice, questions, or adjustments.</p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services">
        <h2>Our Services</h2>
        <div className="services-grid">
          <div className="service-item">
            <h3>Skincare Consultation</h3>
            <p>Expert consultation to identify your skin type and specific concerns.</p>
          </div>
          <div className="service-item">
            <h3>Routine Creation</h3>
            <p>Customized daily skincare routines for morning and evening.</p>
          </div>
          <div className="service-item">
            <h3>Education & Tips</h3>
            <p>Learn about skincare ingredients, techniques, and best practices.</p>
          </div>
          <div className="service-item">
            <h3>Product Recommendations</h3>
            <p>Get personalized product suggestions that work for your skin.</p>
          </div>
          <div className="service-item">
            <h3>24/7 Chat Support</h3>
            <p>Access professional advice anytime through our chat system.</p>
          </div>
          <div className="service-item">
            <h3>Progress Monitoring</h3>
            <p>Regular check-ins to monitor improvement and adjust routines.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Transform Your Skin?</h2>
        <p>Join thousands of people who have found their perfect skincare routine with TwachaGuide.</p>
        <button 
          className="btn btn-large"
          onClick={() => setCurrentPage('login')}
        >
          Start Your Skin Journey Today
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>TwachaGuide</h4>
            <p>Your trusted partner in skincare health.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 TwachaGuide. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
