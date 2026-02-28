import { useEffect, useState } from "react";

import {
  listCounsellorsRequest,
  listSessionsRequest,
  requestSessionRequest,
  acceptSessionRequest,
  rejectSessionRequest,
  rescheduleSessionRequest,
  confirmSessionRequest,
  cancelSessionRequest,
} from "../api/sessionApi";

/* ─── status badge colors ─── */
const statusClass = {
  pending: "badge-pending",
  accepted: "badge-accepted",
  rejected: "badge-rejected",
  rescheduled: "badge-rescheduled",
  confirmed: "badge-confirmed",
  cancelled: "badge-cancelled",
};

/* ─── date helpers ─── */
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

const toDatetimeLocal = (d) => {
  const dt = d ? new Date(d) : new Date(Date.now() + 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

/* ================================================================
   Main page – decides which view to render based on user role
   ================================================================ */
function CounselingPage({ currentUser }) {
  const isCounselor = currentUser?.role === "career_counselor";

  return isCounselor ? (
    <CounselorDashboard currentUser={currentUser} />
  ) : (
    <JobSeekerView currentUser={currentUser} />
  );
}

/* ================================================================
   JOB SEEKER VIEW
   – Browse counselors, book sessions, manage own sessions
   ================================================================ */
function JobSeekerView({ currentUser }) {
  const [tab, setTab] = useState("book"); // "book" | "appointments"
  const [counsellors, setCounsellors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* booking form */
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [bookDate, setBookDate] = useState(toDatetimeLocal());
  const [bookNotes, setBookNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ── load counsellors ── */
  const loadCounsellors = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listCounsellorsRequest();
      setCounsellors(data.counsellors || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── load sessions ── */
  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSessionsRequest();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "book") loadCounsellors();
    else loadSessions();
  }, [tab]);

  /* ── submit booking ── */
  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedCounselor) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await requestSessionRequest({
        counselorId: selectedCounselor.id,
        scheduledAt: new Date(bookDate).toISOString(),
        notes: bookNotes.trim(),
      });
      setSuccess(`Session requested with ${selectedCounselor.fullName}!`);
      setSelectedCounselor(null);
      setBookNotes("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── session actions (confirm / cancel) ── */
  const handleAction = async (sessionId, action) => {
    setError("");
    setSuccess("");
    try {
      if (action === "confirm") await confirmSessionRequest(sessionId);
      if (action === "cancel") await cancelSessionRequest(sessionId);
      setSuccess(`Session ${action}ed`);
      loadSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="counseling-page">
      <div className="counseling-header">
        <h2>Counseling</h2>
        <div className="counseling-tabs">
          <button type="button" className={tab === "book" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("book")}>
            Book a Session
          </button>
          <button type="button" className={tab === "appointments" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("appointments")}>
            My Appointments
          </button>
        </div>
      </div>

      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {success ? <div className="success-banner" role="status">{success}</div> : null}

      {tab === "book" ? (
        <>
          {/* ── scheduling modal ── */}
          {selectedCounselor ? (
            <div className="modal-backdrop" role="presentation">
              <div className="modal-card schedule-modal" role="dialog" aria-modal="true">
                <h4>Schedule Session with {selectedCounselor.fullName}</h4>
                <form onSubmit={handleBook} className="schedule-form">
                  <label>
                    Date &amp; Time
                    <input type="datetime-local" value={bookDate} onChange={(e) => setBookDate(e.target.value)} required />
                  </label>
                  <label>
                    Notes (optional)
                    <textarea value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} maxLength={500} placeholder="Anything you'd like the counselor to know..." />
                  </label>
                  <div className="modal-actions">
                    <button type="button" className="small-btn" onClick={() => setSelectedCounselor(null)} disabled={submitting}>Cancel</button>
                    <button type="submit" className="submit-btn" disabled={submitting}>{submitting ? "Sending..." : "Request Booking"}</button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {/* ── counselor cards ── */}
          <p className="section-label">Your Top Counselor Matches</p>
          {loading ? <p className="empty-text">Loading counselors...</p> : null}
          {!loading && counsellors.length === 0 ? <p className="empty-text">No counselors available right now.</p> : null}

          <div className="counselor-grid">
            {counsellors.map((c) => (
              <article className="counselor-card" key={c.id}>
                <div className="counselor-avatar">
                  {c.profileImageUrl ? <img src={c.profileImageUrl} alt={c.fullName} /> : <span className="avatar-placeholder">{c.fullName.charAt(0)}</span>}
                </div>
                <h4>{c.fullName}</h4>
                {c.bio ? <p className="counselor-bio">{c.bio}</p> : null}
                <div className="chip-row">
                  {c.skills.slice(0, 4).map((s) => (
                    <span key={s} className="interest-chip">{s}</span>
                  ))}
                </div>
                <button type="button" className="submit-btn" onClick={() => { setSelectedCounselor(c); setBookDate(toDatetimeLocal()); }}>
                  Schedule Session
                </button>
              </article>
            ))}
          </div>
        </>
      ) : (
        /* ── appointments list ── */
        <>
          {loading ? <p className="empty-text">Loading sessions...</p> : null}
          {!loading && sessions.length === 0 ? <p className="empty-text">No sessions yet. Book your first session!</p> : null}

          <div className="session-list">
            {sessions.map((s) => (
              <article className="session-card" key={s.id}>
                <div className="session-card-top">
                  <strong>{s.counselor?.fullName || "Counselor"}</strong>
                  <span className={`status-badge ${statusClass[s.status] || ""}`}>{s.status}</span>
                </div>
                <div className="session-detail-row">
                  <span>Scheduled: {fmtDate(s.scheduledAt)}</span>
                  {s.rescheduledAt ? <span>New time: {fmtDate(s.rescheduledAt)}</span> : null}
                </div>
                {s.notes ? <p className="session-notes">{s.notes}</p> : null}

                <div className="session-actions">
                  {s.status === "rescheduled" ? (
                    <>
                      <button type="button" className="small-btn" onClick={() => handleAction(s.id, "confirm")}>Confirm</button>
                      <button type="button" className="small-btn danger-btn" onClick={() => handleAction(s.id, "cancel")}>Cancel</button>
                    </>
                  ) : null}
                  {["pending", "accepted", "confirmed"].includes(s.status) ? (
                    <button type="button" className="small-btn danger-btn" onClick={() => handleAction(s.id, "cancel")}>Cancel</button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ================================================================
   COUNSELOR DASHBOARD
   – See incoming requests, accept / reject / reschedule
   ================================================================ */
function CounselorDashboard({ currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* reschedule state */
  const [rescheduling, setRescheduling] = useState(null); // session id
  const [newDate, setNewDate] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSessionsRequest();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessions(); }, []);

  const handleAction = async (sessionId, action) => {
    setError("");
    setSuccess("");
    setActionLoading(sessionId);
    try {
      if (action === "accept") await acceptSessionRequest(sessionId);
      if (action === "reject") await rejectSessionRequest(sessionId);
      setSuccess(`Session ${action}ed`);
      loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduling || !newDate) return;
    setError("");
    setSuccess("");
    setActionLoading(rescheduling);
    try {
      await rescheduleSessionRequest(rescheduling, new Date(newDate).toISOString());
      setSuccess("Session rescheduled");
      setRescheduling(null);
      loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  };

  return (
    <section className="counseling-page">
      <div className="counseling-header">
        <h2>Counseling Dashboard</h2>
        <span className="resource-count">{sessions.length} requests</span>
      </div>

      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {success ? <div className="success-banner" role="status">{success}</div> : null}

      {/* reschedule modal */}
      {rescheduling ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h4>Reschedule Session</h4>
            <form onSubmit={handleReschedule} className="schedule-form">
              <label>
                New Date &amp; Time
                <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              </label>
              <div className="modal-actions">
                <button type="button" className="small-btn" onClick={() => setRescheduling(null)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={actionLoading === rescheduling}>
                  {actionLoading === rescheduling ? "Saving..." : "Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {loading ? <p className="empty-text">Loading requests...</p> : null}
      {!loading && sessions.length === 0 ? <p className="empty-text">No session requests yet.</p> : null}

      <div className="session-list">
        {sessions.map((s) => (
          <article className="session-card" key={s.id}>
            <div className="session-card-top">
              <strong>{s.jobSeeker?.fullName || "Job Seeker"}</strong>
              <span className={`status-badge ${statusClass[s.status] || ""}`}>{s.status}</span>
            </div>
            <div className="session-detail-row">
              <span>Scheduled: {fmtDate(s.scheduledAt)}</span>
              {s.rescheduledAt ? <span>Rescheduled to: {fmtDate(s.rescheduledAt)}</span> : null}
            </div>
            {s.notes ? <p className="session-notes">{s.notes}</p> : null}

            <div className="session-actions">
              {s.status === "pending" ? (
                <>
                  <button type="button" className="small-btn" disabled={actionLoading === s.id} onClick={() => handleAction(s.id, "accept")}>Accept</button>
                  <button type="button" className="small-btn danger-btn" disabled={actionLoading === s.id} onClick={() => handleAction(s.id, "reject")}>Reject</button>
                  <button type="button" className="small-btn" disabled={actionLoading === s.id} onClick={() => { setRescheduling(s.id); setNewDate(toDatetimeLocal(s.scheduledAt)); }}>Reschedule</button>
                </>
              ) : null}
              {s.status === "accepted" ? (
                <button type="button" className="small-btn" disabled={actionLoading === s.id} onClick={() => { setRescheduling(s.id); setNewDate(toDatetimeLocal(s.scheduledAt)); }}>Reschedule</button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CounselingPage;
