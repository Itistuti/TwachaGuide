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
            <h3>Personalized Skin Advice</h3>
            <p>Recommendations tailored to your skin type and concerns.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Expert Guidance</h3>
            <p>Advice informed and approved by dermatology professionals.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Product Recommendations</h3>
            <p>Curated skincare products suited for your skin.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Quick Tips & Tricks</h3>
            <p>Short, actionable advice for better skin care.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Chat Directly with a Doctor</h3>
            <p>Get professional guidance from certified dermatologists anytime.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Routine Setter</h3>
            <p>Set your skincare routine for easy tracking and consistency.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Tell Us About Your Skin</h3>
            <p>Share your skin type, concerns, and goals.</p>
          </div>
          <div className="step-divider"></div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Get Your Personalized Routine</h3>
            <p>Morning, night, and everything in between.</p>
          </div>
          <div className="step-divider"></div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Track & Chat Anytime</h3>
            <p>Monitor progress and ask questions whenever you need.</p>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="services">
        <h2>Key Features</h2>
        <div className="services-grid">
          <div className="service-item">
            <h3>Personalized Routines</h3>
            <p>Skincare plans created specifically for your skin type, concerns, and goals.</p>
          </div>
          <div className="service-item">
            <h3>Expert Advice</h3>
            <p>Connect with certified dermatologists for professional guidance anytime.</p>
          </div>
          <div className="service-item">
            <h3>Product Suggestions</h3>
            <p>Curated products that suit your skin and lifestyle.</p>
          </div>
          <div className="service-item">
            <h3>Daily Tips & Tricks</h3>
            <p>Quick, actionable advice to keep your skin healthy and glowing.</p>
          </div>
          <div className="service-item">
            <h3>AI Assistant Support</h3>
            <p>Get instant answers to skincare questions anytime.</p>
          </div>
          <div className="service-item">
            <h3>Progress Tracking</h3>
            <p>Monitor your skin’s improvement and adjust routines for the best results.</p>
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
