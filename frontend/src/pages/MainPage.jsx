import { useCallback, useEffect, useMemo, useState } from "react";
import AIRecommendationsPage from "./AIRecommendationsPage";
import CommunityPage from "./CommunityPage";
import CounselingPage from "./CounselingPage";
import JobsPage from "./JobsPage";
import ProfilePage from "./ProfilePage";
import ResourcesPage from "./ResourcesPage";

import { listSessionsRequest } from "../api/sessionApi";
import { listJobsRequest } from "../api/jobApi";
import { listPostsRequest } from "../api/communityApi";

const navItems = [
  { id: "journey", label: "My Journey" },
  { id: "ai-coach", label: "AI Coach" },
  { id: "counseling", label: "Counseling" },
  { id: "resources", label: "Resources" },
  { id: "jobs", label: "Jobs" },
  { id: "community", label: "Community" },
];

/* ── helpers ── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function computeMilestones(user) {
  const p = user?.profile || {};
  return [
    { label: "Resume Review", done: (p.education?.length || 0) > 0 || (p.bio?.length || 0) > 20 },
    { label: "Mock Interview", done: (p.experience?.length || 0) > 0 },
    { label: "Skill Workshop", done: (p.skills?.length || 0) >= 3 },
    { label: "First Job", done: false }, // updated below from applications
  ];
}

/* ── SVG progress ring ── */
function ProgressRingSvg({ pct }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg className="progress-ring-svg" width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#d9ebf9" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#1885d5"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="60" y="66" textAnchor="middle" className="progress-ring-text">
        {pct}%
      </text>
    </svg>
  );
}

function DashboardPage({ currentUser, onNavigate }) {
  const firstName = useMemo(() => currentUser?.fullName?.split(" ")[0] ?? "there", [currentUser]);
  const profileScore = currentUser?.profile?.profileCompletionScore ?? 0;

  const [sessionSummary, setSessionSummary] = useState(null);
  const [jobSummary, setJobSummary] = useState(null);
  const [communitySummary, setCommunitySummary] = useState(null);
  const [applicationCount, setApplicationCount] = useState(0);

  const milestones = useMemo(() => {
    const m = computeMilestones(currentUser);
    if (applicationCount > 0) m[3] = { ...m[3], done: true };
    return m;
  }, [currentUser, applicationCount]);

  /* Fetch real summary data */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      /* sessions */
      try {
        const { sessions } = await listSessionsRequest();
        if (cancelled) return;
        const upcoming = sessions
          .filter((s) => s.status === "accepted" || s.status === "confirmed" || s.status === "pending")
          .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
        const next = upcoming[0];
        setSessionSummary({
          total: sessions.length,
          upcoming: upcoming.length,
          next,
        });
      } catch {
        /* ignore – user may not have sessions yet */
      }

      /* jobs */
      try {
        const { jobs } = await listJobsRequest();
        if (cancelled) return;
        const now = new Date();
        const open = jobs.filter((j) => new Date(j.applicationDeadline) > now);
        setJobSummary({ total: jobs.length, open: open.length, latest: jobs[0] });
      } catch {
        /* ignore */
      }

      /* community */
      try {
        const { posts } = await listPostsRequest();
        if (cancelled) return;
        setCommunitySummary({ total: posts.length, latest: posts[0] });
      } catch {
        /* ignore */
      }

      /* application count (for milestone) */
      try {
        const mod = await import("../api/jobApi");
        const { applications } = await mod.listMyApplicationsRequest();
        if (cancelled) return;
        setApplicationCount(applications?.length || 0);
      } catch {
        /* ignore */
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Format the next session nicely */
  const nextSessionText = useMemo(() => {
    if (!sessionSummary?.next) return null;
    const s = sessionSummary.next;
    const otherName =
      currentUser?.role === "career_counselor"
        ? s.jobSeeker?.fullName || "a seeker"
        : s.counselor?.fullName || "a counselor";
    const dt = new Date(s.scheduledAt);
    const today = new Date();
    const isToday = dt.toDateString() === today.toDateString();
    const dayLabel = isToday ? "Today" : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const timeLabel = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${dayLabel} at ${timeLabel} with ${otherName.split(" ")[0]}`;
  }, [sessionSummary, currentUser]);

  return (
    <section className="dashboard-wrap">
      <article className="hero-banner">
        <div>
          <h2>{getGreeting()}, {firstName}!</h2>
          <p>Let&apos;s take the next step in your career.</p>
        </div>
        <span className="hero-emoji" aria-hidden="true">🚀</span>
      </article>

      <div className="top-panels">
        {/* Progress Tracker */}
        <article className="panel progress-panel">
          <h3>Progress Tracker</h3>
          <div className="progress-content">
            <ProgressRingSvg pct={profileScore} />
            <div>
              <p className="panel-muted">Progress</p>
              <strong>Profile Complete</strong>
              <button type="button" className="small-btn" onClick={() => onNavigate("profile")}>
                Complete Profile
              </button>
            </div>
          </div>
        </article>

        {/* Journey Milestones — real data */}
        <article className="panel milestone-panel">
          <h3>My Journey Milestone</h3>
          <div className="milestones">
            {milestones.map((m) => (
              <span key={m.label} className={m.done ? "active" : ""}>
                {m.label}
              </span>
            ))}
          </div>
        </article>
      </div>

      {/* Feature cards — real data, clickable */}
      <div className="feature-grid">
        <article
          className="feature-card feature-blue clickable-card"
          onClick={() => onNavigate("counseling")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onNavigate("counseling")}
        >
          <h4>Counselor Sessions</h4>
          {sessionSummary ? (
            <>
              <p>
                {sessionSummary.upcoming > 0
                  ? `Upcoming: ${nextSessionText}`
                  : sessionSummary.total > 0
                    ? "No upcoming sessions"
                    : "No sessions yet"}
              </p>
              <small>
                {sessionSummary.total} total session{sessionSummary.total !== 1 ? "s" : ""}
                {sessionSummary.upcoming > 0 ? ` · ${sessionSummary.upcoming} upcoming` : ""}
              </small>
            </>
          ) : (
            <>
              <p>Loading…</p>
              <small>&nbsp;</small>
            </>
          )}
        </article>

        <article
          className="feature-card feature-green clickable-card"
          onClick={() => onNavigate("jobs")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onNavigate("jobs")}
        >
          <h4>Job Postings</h4>
          {jobSummary ? (
            <>
              <p>
                {jobSummary.open > 0
                  ? `${jobSummary.open} Open Position${jobSummary.open !== 1 ? "s" : ""}`
                  : jobSummary.total > 0
                    ? "No open positions right now"
                    : "No jobs posted yet"}
              </p>
              <small>
                {jobSummary.latest
                  ? `Latest: ${jobSummary.latest.title} at ${jobSummary.latest.company}`
                  : "Browse all jobs"}
              </small>
            </>
          ) : (
            <>
              <p>Loading…</p>
              <small>&nbsp;</small>
            </>
          )}
        </article>

        <article
          className="feature-card feature-purple clickable-card"
          onClick={() => onNavigate("community")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onNavigate("community")}
        >
          <h4>Community Feed</h4>
          {communitySummary ? (
            <>
              <p>
                {communitySummary.latest
                  ? communitySummary.latest.title
                  : "No discussions yet"}
              </p>
              <small>
                {communitySummary.latest
                  ? `${communitySummary.latest.repliesCount} Repl${communitySummary.latest.repliesCount !== 1 ? "ies" : "y"} · ${communitySummary.total} post${communitySummary.total !== 1 ? "s" : ""}`
                  : "Start a conversation"}
              </small>
            </>
          ) : (
            <>
              <p>Loading…</p>
              <small>&nbsp;</small>
            </>
          )}
        </article>

        <article
          className="feature-card feature-orange clickable-card"
          onClick={() => onNavigate("resources")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onNavigate("resources")}
        >
          <h4>Resources</h4>
          <p>Articles, videos &amp; guides</p>
          <small>Browse the library</small>
        </article>
      </div>
    </section>
  );
}

function MainPage({ currentUser, onLogout, onUserUpdate }) {
  const [activeSectionId, setActiveSectionId] = useState("journey");

  const activeSection = navItems.find((item) => item.id === activeSectionId);

  const handleNavigate = useCallback((tabId) => {
    setActiveSectionId(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <main className="dashboard-page">
      <header className="top-nav">
        <div className="brand">CareerFlow</div>

        <nav className="nav-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activeSectionId ? "nav-link active" : "nav-link"}
              onClick={() => setActiveSectionId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="user-actions">
          <button
            type="button"
            className={activeSectionId === "profile" ? "user-chip user-chip-active" : "user-chip"}
            onClick={() => setActiveSectionId("profile")}
          >
            My Profile
          </button>
          <button type="button" onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {activeSectionId === "profile" ? (
        <ProfilePage currentUser={currentUser} onUserUpdate={onUserUpdate} />
      ) : activeSectionId === "resources" ? (
        <ResourcesPage currentUser={currentUser} />
      ) : activeSectionId === "ai-coach" ? (
        <AIRecommendationsPage currentUser={currentUser} />
      ) : activeSectionId === "counseling" ? (
        <CounselingPage currentUser={currentUser} />
      ) : activeSectionId === "jobs" ? (
        <JobsPage currentUser={currentUser} />
      ) : activeSectionId === "community" ? (
        <CommunityPage currentUser={currentUser} />
      ) : (
        <DashboardPage currentUser={currentUser} onNavigate={handleNavigate} />
      )}
    </main>
  );
}

export default MainPage;
