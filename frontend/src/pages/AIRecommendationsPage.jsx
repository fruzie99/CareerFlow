import { useEffect, useMemo, useRef, useState } from "react";
import {
  aiCareerPathsRequest,
  aiChatRequest,
  aiResumeFeedbackRequest,
  aiCareerPathTreeRequest,
  aiFitScoreRequest,
} from "../api/aiApi";

/* ═══════════════════════════════════════════
   Shared: Fit-score ring
   ═══════════════════════════════════════════ */

function FitRing({ score, size = 80 }) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#0d8a72" : score >= 50 ? "#d4a017" : "#c0392b";
  return (
    <svg className="fit-ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ecf0" strokeWidth="7" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" className="fit-ring-text" fill={color}>
        {score}%
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════
   Sidebar
   ═══════════════════════════════════════════ */

const SERVICES = [
  { id: "chat", icon: "💬", label: "AI Career Chat" },
  { id: "paths", icon: "🚀", label: "Career Path Suggestions" },
  { id: "tree", icon: "🌳", label: "Path Explorer" },
  { id: "resume", icon: "📄", label: "Resume Feedback" },
  { id: "fitscore", icon: "🎯", label: "Job Fit Check" },
];

function Sidebar({ active, onSelect }) {
  return (
    <aside className="aic-sidebar">
      <div className="aic-sidebar-brand">
        <span className="aic-sidebar-logo">🧠</span>
        <div>
          <strong>AI Coach</strong>
          <small>Powered by Gemini</small>
        </div>
      </div>

      <nav className="aic-sidebar-nav">
        <p className="aic-sidebar-label">Coach Services</p>
        {SERVICES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`aic-sidebar-item ${active === s.id ? "aic-sidebar-active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="aic-sidebar-icon">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ═══════════════════════════════════════════
   Career Path Cards
   ═══════════════════════════════════════════ */

const PATH_COLORS = ["#1a73e8", "#0d8a72", "#6f4db7"];

function CareerPathCards({ paths, onExplore }) {
  return (
    <div className="ai-path-grid">
      {paths.map((p, i) => (
        <article className="ai-path-card" key={p.title} style={{ borderTopColor: PATH_COLORS[i % 3] }}>
          <div className="ai-path-head">
            <div>
              <h4 style={{ color: PATH_COLORS[i % 3] }}>{p.title}</h4>
              <span className="ai-salary">{p.salaryRange}</span>
            </div>
            <FitRing score={p.fitScore} />
          </div>
          <p className="ai-path-desc">{p.description}</p>

          {p.skillsToLearn?.length > 0 && (
            <div className="ai-skills-section">
              <strong>Skills to Learn</strong>
              <div className="chip-row">
                {p.skillsToLearn.map((s) => (
                  <span key={s} className="interest-chip">{s}</span>
                ))}
              </div>
            </div>
          )}

          {p.recommendedCourse && (
            <div className="ai-course-box">
              <span className="ai-course-icon">📚</span>
              <div>
                <strong>{p.recommendedCourse.name}</strong>
                <small>{p.recommendedCourse.reason}</small>
              </div>
            </div>
          )}

          {p.steps?.length > 0 && (
            <div className="ai-steps">
              <strong>Steps</strong>
              <ol>
                {p.steps.map((s, idx) => <li key={idx}>{s}</li>)}
              </ol>
            </div>
          )}

          <button
            type="button"
            className="submit-btn ai-explore-btn"
            onClick={() => onExplore(p.title)}
          >
            Explore Path →
          </button>
        </article>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Career Path Tree
   ═══════════════════════════════════════════ */

function PathTreeView({ tree, onBack }) {
  const [expandedStep, setExpandedStep] = useState(null);
  if (!tree) return null;
  return (
    <div className="ai-tree-view">
      <button type="button" className="small-btn ai-back-btn" onClick={onBack}>← Back</button>
      <h3 className="ai-tree-title">Path to <strong>{tree.goalRole}</strong></h3>
      <p className="ai-tree-meta">Estimated timeline: {tree.estimatedTotalYears}</p>

      <div className="ai-tree-nodes">
        {tree.nodes?.map((node, i) => (
          <div key={i} className="ai-tree-node-wrap">
            {i > 0 && <div className="ai-tree-connector" />}
            <article
              className={`ai-tree-node ${expandedStep === i ? "ai-tree-node-expanded" : ""}`}
              onClick={() => setExpandedStep(expandedStep === i ? null : i)}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setExpandedStep(expandedStep === i ? null : i)}
            >
              <div className="ai-tree-node-head">
                <span className="ai-tree-step">Step {node.step}</span>
                <h4>{node.role}</h4>
                <span className="ai-tree-salary">{node.avgSalary}</span>
              </div>
              {expandedStep === i && (
                <div className="ai-tree-node-details">
                  <p><strong>Time in role:</strong> {node.yearsInRole}</p>
                  {node.keySkills?.length > 0 && <p><strong>Key Skills:</strong> {node.keySkills.join(", ")}</p>}
                  {node.certifications?.length > 0 && <p><strong>Certifications:</strong> {node.certifications.join(", ")}</p>}
                  {node.responsibilities?.length > 0 && (
                    <div>
                      <strong>Responsibilities:</strong>
                      <ul>{node.responsibilities.map((r, ri) => <li key={ri}>{r}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          </div>
        ))}
      </div>

      {tree.advice && <p className="ai-tree-advice">💡 {tree.advice}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Resume Feedback Panel
   ═══════════════════════════════════════════ */

function ResumePanel() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      setResult(await aiResumeFeedbackRequest(file));
    } catch (err) {
      setError(err.message || "Could not analyze resume");
    } finally { setLoading(false); }
  };

  return (
    <div className="aic-panel">
      <div className="aic-panel-header">
        <h3>📄 Resume Feedback</h3>
        <p>Upload your resume (PDF) for ATS compatibility analysis</p>
      </div>

      <div className="aic-upload-row">
        <label className="aic-file-label">
          <span className="aic-file-icon">📎</span>
          {file ? file.name : "Choose PDF file"}
          <input
            type="file" accept=".pdf" hidden
            onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setError(""); }}
          />
        </label>
        <button type="button" className="submit-btn" disabled={!file || loading} onClick={handleUpload}>
          {loading ? "Analyzing…" : "Analyze Resume"}
        </button>
      </div>

      {loading && <div className="ai-loading"><div className="ai-spinner" /><p>Scanning your resume…</p></div>}
      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div className="aic-result-card">
          <div className="aic-score-header">
            <FitRing score={result.score} size={100} />
            <div>
              <h4>ATS Compatibility Score</h4>
              <p className="aic-score-verdict">
                {result.score >= 75 ? "✅ Great resume!" : result.score >= 50 ? "🟡 Good, with room for improvement" : "🔴 Needs significant improvements"}
              </p>
            </div>
          </div>

          <div className="aic-feedback-grid">
            {result.strengths?.length > 0 && (
              <div className="aic-feedback-card aic-fb-green">
                <h5>✅ Strengths</h5>
                <ul>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {result.improvements?.length > 0 && (
              <div className="aic-feedback-card aic-fb-orange">
                <h5>🔧 Improvements</h5>
                <ul>{result.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </div>

          {result.keywords?.length > 0 && (
            <div className="aic-keywords">
              <h5>🔑 Recommended Keywords</h5>
              <div className="chip-row">{result.keywords.map((k) => <span key={k} className="interest-chip">{k}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Fit Score Panel
   ═══════════════════════════════════════════ */

function FitScorePanel() {
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!jobDesc.trim() || jobDesc.trim().length < 10) return;
    setLoading(true); setError(""); setResult(null);
    try {
      setResult(await aiFitScoreRequest(jobDesc.trim()));
    } catch (err) {
      setError(err.message || "Could not calculate fit score");
    } finally { setLoading(false); }
  };

  return (
    <div className="aic-panel">
      <div className="aic-panel-header">
        <h3>🎯 Job Fit Check</h3>
        <p>Paste a job description to see how well your profile matches</p>
      </div>

      <form onSubmit={handleCheck}>
        <textarea
          className="aic-textarea"
          placeholder="Paste the full job description here…"
          value={jobDesc} onChange={(e) => setJobDesc(e.target.value)}
          rows={6} maxLength={5000}
        />
        <button type="submit" className="submit-btn" disabled={loading || jobDesc.trim().length < 10} style={{ marginTop: 10 }}>
          {loading ? "Analyzing…" : "Check Fit Score"}
        </button>
      </form>

      {loading && <div className="ai-loading"><div className="ai-spinner" /><p>Comparing your profile…</p></div>}
      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div className="aic-result-card">
          <div className="aic-score-header">
            <FitRing score={result.score} size={110} />
            <div>
              <h4>Job Fit</h4>
              <p className="aic-score-verdict">
                {result.score >= 75 ? "Strong match!" : result.score >= 50 ? "Decent match with gaps" : "Significant gaps to address"}
              </p>
              {result.reason && <p className="aic-score-reason">{result.reason}</p>}
            </div>
          </div>

          <div className="aic-feedback-grid">
            {result.matchedSkills?.length > 0 && (
              <div className="aic-feedback-card aic-fb-green">
                <h5>✅ Matched Skills</h5>
                <div className="chip-row">{result.matchedSkills.map((s) => <span key={s} className="interest-chip chip-green">{s}</span>)}</div>
              </div>
            )}
            {result.missingSkills?.length > 0 && (
              <div className="aic-feedback-card aic-fb-red">
                <h5>🔴 Missing Skills</h5>
                <div className="chip-row">{result.missingSkills.map((s) => <span key={s} className="interest-chip chip-red">{s}</span>)}</div>
              </div>
            )}
          </div>

          {result.tips?.length > 0 && (
            <div className="aic-tips">
              <h5>💡 Tips to Improve</h5>
              <ul>{result.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Chat Panel (main content area)
   ═══════════════════════════════════════════ */

const SMART_CHIPS = [
  "What career paths suit me?",
  "How do I prepare for interviews?",
  "What skills should I learn next?",
  "How can I improve my resume?",
  "Suggest certifications for my field",
];

function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const buildHistory = () =>
    messages.map((m) => ({
      role: m.from === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

  const send = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { from: "user", text }]);
    setLoading(true);
    try {
      const { reply } = await aiChatRequest(text, buildHistory());
      setMessages((prev) => [...prev, { from: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { from: "ai", text: `⚠️ ${err.message}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="aic-chat">
      {/* Header */}
      <div className="aic-chat-head">
        <div className="aic-chat-head-left">
          <span className="aic-chat-avatar">🤖</span>
          <div>
            <strong>AI Career Coach</strong>
            <small>Ask me anything about your career</small>
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" className="aic-clear-btn" onClick={() => setMessages([])}>Clear</button>
        )}
      </div>

      {/* Messages */}
      <div className="aic-chat-body" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="aic-chat-empty">
            <div className="aic-chat-empty-icon">🧠</div>
            <h3>Hi! I'm your AI Career Coach</h3>
            <p>Ask me about career paths, interview prep, skill recommendations, salary negotiation, or anything career-related!</p>
            <p className="aic-chip-label">Quick questions:</p>
            <div className="aic-chips">
              {SMART_CHIPS.map((chip) => (
                <button key={chip} type="button" className="aic-chip" onClick={() => send(chip)}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`aic-msg aic-msg-${m.from}`}>
            {m.from === "ai" && <span className="aic-msg-ava">🤖</span>}
            <div className="aic-bubble">
              {m.text.split("\n").map((line, li, arr) => (
                <span key={li}>{line}{li < arr.length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="aic-msg aic-msg-ai">
            <span className="aic-msg-ava">🤖</span>
            <div className="aic-bubble aic-typing">
              <span className="aic-dot" /><span className="aic-dot" /><span className="aic-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form className="aic-chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          type="text"
          placeholder="Ask me anything about your career…"
          value={input} onChange={(e) => setInput(e.target.value)}
          maxLength={2000} disabled={loading}
        />
        <button type="submit" className="aic-send-btn" disabled={loading || !input.trim()}>➤</button>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */

function AIRecommendationsPage({ currentUser }) {
  const [section, setSection] = useState("chat");
  const [paths, setPaths] = useState(null);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [pathsError, setPathsError] = useState("");

  const [tree, setTree] = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [goalInput, setGoalInput] = useState("");

  const loadPaths = async () => {
    setPathsLoading(true); setPathsError("");
    try {
      const data = await aiCareerPathsRequest();
      setPaths(data.paths || []);
    } catch (err) {
      setPathsError(err.message || "Could not generate career paths");
    } finally { setPathsLoading(false); }
  };

  const handleSelect = (id) => {
    setSection(id);
    if (id === "paths" && !paths && !pathsLoading) loadPaths();
  };

  const exploreGoal = async (goalRole) => {
    setTreeLoading(true); setTreeError(""); setTree(null);
    setSection("tree");
    try { setTree(await aiCareerPathTreeRequest(goalRole)); }
    catch (err) { setTreeError(err.message || "Could not generate path tree"); }
    finally { setTreeLoading(false); }
  };

  const handleCustomGoal = (e) => {
    e.preventDefault();
    if (goalInput.trim()) exploreGoal(goalInput.trim());
  };

  const profileSparse = useMemo(() => {
    const p = currentUser?.profile || {};
    return !p.skills?.length && !p.experience?.length && !p.education?.length;
  }, [currentUser]);

  const renderContent = () => {
    switch (section) {
      case "chat":
        return <ChatPanel />;

      case "paths":
        return (
          <div className="aic-panel">
            <div className="aic-panel-header">
              <h3>🚀 Career Path Suggestions</h3>
              <p>Personalized career recommendations based on your profile</p>
            </div>
            <div className="aic-panel-actions">
              <button type="button" className="submit-btn" onClick={loadPaths} disabled={pathsLoading}>
                {pathsLoading ? "Generating…" : "↻ Refresh"}
              </button>
            </div>
            {pathsLoading ? (
              <div className="ai-loading"><div className="ai-spinner" /><p>Analyzing your profile and generating career paths…</p></div>
            ) : pathsError ? (
              <div className="error-banner">{pathsError}</div>
            ) : paths?.length > 0 ? (
              <CareerPathCards paths={paths} onExplore={exploreGoal} />
            ) : paths ? (
              <p className="empty-text">No career paths generated. Try refreshing.</p>
            ) : null}
          </div>
        );

      case "tree":
        return (
          <div className="aic-panel">
            <div className="aic-panel-header">
              <h3>🌳 Path Explorer</h3>
              <p>Map out the steps to reach your dream role</p>
            </div>
            <form className="ai-goal-form" onSubmit={handleCustomGoal}>
              <input
                type="text" placeholder="e.g. Chief Technology Officer" maxLength={200}
                value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
              />
              <button type="submit" className="submit-btn" disabled={treeLoading || !goalInput.trim()}>
                {treeLoading ? "Generating…" : "Generate Path"}
              </button>
            </form>
            {treeLoading ? (
              <div className="ai-loading"><div className="ai-spinner" /><p>Building your career trajectory…</p></div>
            ) : treeError ? (
              <div className="error-banner">{treeError}</div>
            ) : tree ? (
              <PathTreeView tree={tree} onBack={() => setSection("paths")} />
            ) : (
              <p className="empty-text">Enter a goal role above, or click "Explore Path" from Career Path Suggestions.</p>
            )}
          </div>
        );

      case "resume":
        return <ResumePanel />;

      case "fitscore":
        return <FitScorePanel />;

      default:
        return null;
    }
  };

  return (
    <section className="aic-layout">
      <Sidebar active={section} onSelect={handleSelect} />

      <main className="aic-main">
        {profileSparse && (
          <div className="ai-profile-warning">
            ⚠️ Your profile is incomplete — add skills, education &amp; experience for better recommendations.
          </div>
        )}
        {renderContent()}
      </main>
    </section>
  );
}

export default AIRecommendationsPage;
