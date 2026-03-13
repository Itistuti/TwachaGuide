import React, { useState, useEffect, useRef } from "react";
import Home from "./components/Home";
import Authentication from "./components/Authentication";
import CustomerDashboard from "./components/CustomerDashboard";
import DermatologistDashboard from "./components/DermatologistDashboard";
import PartnershipDashboard from "./components/PartnershipDashboard";
import AdminDashboard from "./components/AdminDashboard";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  // Load authentication state from localStorage on app mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const savedLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const savedUserRole = localStorage.getItem('userRole');
    const savedUserEmail = localStorage.getItem('userEmail');

    if (savedLoggedIn && savedUserEmail) {
      // Verify the session is still valid on the backend
      verifySession(savedUserEmail, savedUserRole);
    } else {
      setLoading(false);
    }
  }, []);

  // Verify session with backend
  const verifySession = async (email, role) => {
    try {
      const token = localStorage.getItem('authToken');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch("http://127.0.0.1:8000/profile/", {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        const resolvedEmail = data.email || email;
        const resolvedRole = data.role || role;
        // Session is valid, restore the state
        setUserEmail(resolvedEmail);
        setUserRole(resolvedRole);
        if (resolvedEmail) {
          localStorage.setItem('userEmail', resolvedEmail);
        }
        if (resolvedRole) {
          localStorage.setItem('userRole', resolvedRole);
        }
        setLoggedIn(true);
        setCurrentPage('dashboard');
      } else {
        // Session invalid, clear everything
        clearAuth();
      }
    } catch (error) {
      console.error("Session verification failed:", error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const showAuthNotice = (message, type = 'success') => {
    setAuthNotice({ message, type });
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setAuthNotice(null);
      noticeTimerRef.current = null;
    }, 3500);
  };

  // Clear authentication data
  const clearAuth = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    setLoggedIn(false);
    setUserRole(null);
    setUserEmail(null);
    setLoading(false);
  };

  // Enhanced setLoggedIn that also saves to localStorage
  const handleSetLoggedIn = (value) => {
    setLoggedIn(value);
    if (value) {
      localStorage.setItem('loggedIn', 'true');
    } else {
      clearAuth();
    }
  };

  // Enhanced setUserRole that also saves to localStorage
  const handleSetUserRole = (role) => {
    setUserRole(role);
    if (role) {
      localStorage.setItem('userRole', role);
    }
  };

  // Enhanced setUserEmail that also saves to localStorage
  const handleSetUserEmail = (email) => {
    setUserEmail(email);
    if (email) {
      localStorage.setItem('userEmail', email);
    }
  };

  // Show loading spinner while verifying session
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f0fdf4'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
          <p style={{ fontSize: '1.2rem', color: '#16a34a', fontWeight: '600' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {authNotice && (
        <div className={`auth-notice ${authNotice.type}`}>
          {authNotice.message}
        </div>
      )}
      {loggedIn ? (
        // Role-based dashboard routing
        userRole === 'dermatologist' ? (
          <DermatologistDashboard setLoggedIn={handleSetLoggedIn} userEmail={userEmail} />
        ) : userRole === 'admin' ? (
          <AdminDashboard setLoggedIn={handleSetLoggedIn} userEmail={userEmail} />
        ) : userRole === 'partner' ? (
          <PartnershipDashboard setLoggedIn={handleSetLoggedIn} userEmail={userEmail} />
        ) : (
          <CustomerDashboard setLoggedIn={handleSetLoggedIn} userEmail={userEmail} />
        )
      ) : currentPage === 'home' ? (
        <Home setLoggedIn={handleSetLoggedIn} setCurrentPage={setCurrentPage} />
      ) : (
        <Authentication 
          setLoggedIn={handleSetLoggedIn} 
          setCurrentPage={setCurrentPage}
          setUserRole={handleSetUserRole}
          setUserEmail={handleSetUserEmail}
          onAuthSuccess={showAuthNotice}
          initialMode={currentPage === 'signup' ? 'signup' : 'login'}
        />
      )}
    </div>
  );
}

export default App;