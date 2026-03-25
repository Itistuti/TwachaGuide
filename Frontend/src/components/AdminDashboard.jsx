import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";

const API = "http://127.0.0.1:8000";

function AdminDashboard({ setLoggedIn, userEmail }) {
  const [users, setUsers] = useState([]);
  const [queue, setQueue] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    return url.startsWith('http') ? url : `${API}${url}`;
  };

  const renderDocumentPreview = (label, url) => {
    if (!url) {
      return <span>{`Missing ${label}`}</span>;
    }

    const src = toAbsoluteUrl(url);
    return (
      <div className="admin-doc-item">
        <img src={src} alt={label} className="admin-doc-image" />
        <a href={src} target="_blank" rel="noreferrer">{label}</a>
      </div>
    );
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Token ${token}` } : {};
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      setError(err.message || 'Failed to load users');
    }
  };

  const loadQueue = async () => {
    try {
      const res = await fetch(`${API}/api/admin/dermatologists/?status=pending`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.dermatologists || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load queue');
      }
    } catch (err) {
      setError(err.message || 'Failed to load queue');
    }
  };

  const loadPartnerships = async () => {
    try {
      const res = await fetch(`${API}/api/admin/partnerships/?status=pending`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        setPartnerships(data.partnership_requests || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load partnership queue');
      }
    } catch (err) {
      setError(err.message || 'Failed to load partnership queue');
    }
  };

  useEffect(() => {
    loadUsers();
    loadQueue();
    loadPartnerships();
  }, []);

  const updateStatus = async (userId, status) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/dermatologists/${userId}/status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await loadQueue();
        await loadUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
    setLoading(false);
  };

  const updatePartnershipStatus = async (requestId, status) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/partnerships/${requestId}/status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await loadPartnerships();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update partnership status');
      }
    } catch (err) {
      setError(err.message || 'Failed to update partnership status');
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      await fetch(`${API}/logout/`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
    } catch (_) {}
    finally {
      localStorage.removeItem('authToken');
      setLoggedIn(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Welcome, {userEmail}</p>
        </div>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-section">
        <h3>Dermatologist Verification Queue</h3>
        {queue.length === 0 ? (
          <p className="admin-empty">No pending registrations.</p>
        ) : (
          <div className="admin-card-list">
            {queue.map((item) => (
              <div key={item.user_id} className="admin-card">
                <div className="admin-card-info">
                  <div className="admin-name">{item.name || item.email}</div>
                  <div className="admin-email">{item.email}</div>
                  <div className="admin-address">{item.address || 'No address provided'}</div>
                </div>
                <div className="admin-docs">
                  {renderDocumentPreview('NMC Certificate', item.nmc_certificate)}
                  {renderDocumentPreview('PAN Card', item.pan_card)}
                </div>
                <div className="admin-actions">
                  <button
                    className="approve-btn"
                    disabled={loading}
                    onClick={() => updateStatus(item.user_id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="reject-btn"
                    disabled={loading}
                    onClick={() => updateStatus(item.user_id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h3>Partnership Requests Queue</h3>
        {partnerships.length === 0 ? (
          <p className="admin-empty">No pending partnership requests.</p>
        ) : (
          <div className="admin-card-list">
            {partnerships.map((item) => (
              <div key={item.id} className="admin-card">
                <div className="admin-card-info">
                  <div className="admin-name">{item.company_name}</div>
                  <div className="admin-email">{item.email}</div>
                  <div className="admin-address">{item.address}</div>
                  <div className="admin-email">Contact: {item.contact_number}</div>
                  <div className="admin-address">Requested by: {item.user_email}</div>
                </div>
                <div className="admin-docs">
                  <div className="admin-doc-item">
                    <span>Product Suggestion: {item.product_suggestion}</span>
                  </div>
                  {renderDocumentPreview('Partner PAN Card', item.partner_pan_card)}
                </div>
                <div className="admin-actions">
                  <button
                    className="approve-btn"
                    disabled={loading}
                    onClick={() => updatePartnershipStatus(item.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="reject-btn"
                    disabled={loading}
                    onClick={() => updatePartnershipStatus(item.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h3>All Users</h3>
        <div className="admin-table">
          <div className="admin-table-row admin-table-header">
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
          </div>
          {users.map((u) => (
            <div key={u.id} className="admin-table-row">
              <div>{u.email}</div>
              <div>{u.role}</div>
              <div>{u.verification_status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
