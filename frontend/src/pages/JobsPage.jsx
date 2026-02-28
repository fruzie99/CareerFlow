import { useEffect, useMemo, useState } from "react";

import {
  listJobsRequest,
  createJobRequest,
  deleteJobRequest,
  applyToJobRequest,
  listMyApplicationsRequest,
  listApplicantsRequest,
  downloadApplicantsExcelUrl,
} from "../api/jobApi";

/* ── tiny helpers ── */

const isDeadlinePassed = (deadline) => new Date() > new Date(deadline);

const isNewPosting = (createdAt) => {
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() > threeDaysAgo;
};

const quickTags = ["Remote", "Full-time", "Entry-level", "Tech"];

/* ══════════════════════════════════════════
   Counselor – Post‑a‑Job form
   ══════════════════════════════════════════ */

const initialJobForm = {
  title: "",
  company: "",
  location: "",
  description: "",
  salary: "",
  applicationDeadline: "",
  tagsInput: "",
};

function PostJobForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(initialJobForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => {
    setError("");
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      await createJobRequest({
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        salary: form.salary.trim(),
        applicationDeadline: form.applicationDeadline,
        tags,
      });
      setForm(initialJobForm);
      onCreated();
    } catch (err) {
      setError(err.message || "Could not create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="job-post-form" onSubmit={handleSubmit}>
      <h3>Post a Job</h3>
      {error ? <div className="error-banner">{error}</div> : null}
      <input required maxLength={160} placeholder="Job title" value={form.title} onChange={set("title")} />
      <input required maxLength={160} placeholder="Company name" value={form.company} onChange={set("company")} />
      <input required maxLength={200} placeholder="Location (e.g. San Francisco, CA / Remote)" value={form.location} onChange={set("location")} />
      <textarea required maxLength={2000} rows={5} placeholder="Job description / key duties" value={form.description} onChange={set("description")} />
      <input maxLength={100} placeholder="Salary (optional, e.g. $90,000 – $110,000 / year)" value={form.salary} onChange={set("salary")} />
      <label className="form-label">
        Application Deadline
        <input required type="date" value={form.applicationDeadline} onChange={set("applicationDeadline")} />
      </label>
      <input maxLength={200} placeholder="Tags (comma separated, e.g. remote, tech, entry-level)" value={form.tagsInput} onChange={set("tagsInput")} />
      <div className="job-form-actions">
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Posting..." : "Post Job"}
        </button>
        <button type="button" className="small-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════
   Job Seeker – Apply Modal
   ══════════════════════════════════════════ */

function ApplyModal({ job, currentUser, onClose, onApplied }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const profile = currentUser?.profile || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await applyToJobRequest(job.id, { coverLetter: coverLetter.trim(), resumeUrl: resumeUrl.trim() });
      onApplied();
    } catch (err) {
      setError(err.message || "Could not apply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card apply-modal" role="dialog" aria-modal="true">
        <h4>Apply – {job.title}</h4>
        <p className="apply-company">{job.company}</p>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="apply-profile-preview">
          <h5>Your Profile Info (auto-filled)</h5>
          <p><strong>Name:</strong> {currentUser?.fullName}</p>
          <p><strong>Email:</strong> {currentUser?.email}</p>
          {profile.skills?.length ? <p><strong>Skills:</strong> {profile.skills.join(", ")}</p> : null}
          {profile.education?.length ? (
            <p>
              <strong>Education:</strong>{" "}
              {profile.education.map((ed) => [ed.degree, ed.institution].filter(Boolean).join(" – ")).join("; ")}
            </p>
          ) : null}
          {profile.experience?.length ? (
            <p>
              <strong>Experience:</strong>{" "}
              {profile.experience.map((ex) => [ex.title, ex.company].filter(Boolean).join(" at ")).join("; ")}
            </p>
          ) : null}
          {profile.careerInterests?.length ? <p><strong>Interests:</strong> {profile.careerInterests.join(", ")}</p> : null}
        </div>

        <form className="apply-form" onSubmit={handleSubmit}>
          <input
            placeholder="Resume URL (optional)"
            maxLength={500}
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
          />
          <textarea
            placeholder="Cover letter (optional)"
            maxLength={2000}
            rows={4}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />
          <div className="modal-actions">
            <button type="button" className="small-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Counselor – Applicant Viewer
   ══════════════════════════════════════════ */

function ApplicantViewer({ job, onClose }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await listApplicantsRequest(job.id);
        setApplicants(data.applications || []);
      } catch (err) {
        setError(err.message || "Could not load applicants");
      } finally {
        setLoading(false);
      }
    })();
  }, [job.id]);

  const handleDownload = () => {
    const token = localStorage.getItem("ccp_token");
    const url = downloadApplicantsExcelUrl(job.id);
    const a = document.createElement("a");
    a.href = `${url}?token=${encodeURIComponent(token)}`;

    // Use fetch so we can send Authorization header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${job.title.replace(/[^a-zA-Z0-9]/g, "_")}_applicants.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch(() => setError("Could not download file."));
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card applicant-modal" role="dialog" aria-modal="true">
        <h4>Applicants – {job.title}</h4>
        {error ? <div className="error-banner">{error}</div> : null}

        {loading ? (
          <p className="empty-text">Loading applicants...</p>
        ) : applicants.length === 0 ? (
          <p className="empty-text">No applicants yet.</p>
        ) : (
          <>
            <div className="applicant-list">
              {applicants.map((app) => {
                const user = app.applicantId || {};
                return (
                  <div className="applicant-card" key={app.id}>
                    <div className="applicant-header">
                      <strong>{user.fullName || "Unknown"}</strong>
                      <span className="applicant-email">{user.email || ""}</span>
                    </div>
                    {user.profile?.skills?.length ? (
                      <p className="applicant-detail"><strong>Skills:</strong> {user.profile.skills.join(", ")}</p>
                    ) : null}
                    {user.profile?.education?.length ? (
                      <p className="applicant-detail">
                        <strong>Education:</strong>{" "}
                        {user.profile.education.map((e) => [e.degree, e.institution].filter(Boolean).join(" – ")).join("; ")}
                      </p>
                    ) : null}
                    {user.profile?.experience?.length ? (
                      <p className="applicant-detail">
                        <strong>Experience:</strong>{" "}
                        {user.profile.experience.map((e) => [e.title, e.company].filter(Boolean).join(" at ")).join("; ")}
                      </p>
                    ) : null}
                    {app.coverLetter ? <p className="applicant-detail"><strong>Cover Letter:</strong> {app.coverLetter}</p> : null}
                    {app.resumeUrl ? (
                      <p className="applicant-detail">
                        <strong>Resume:</strong>{" "}
                        <a href={app.resumeUrl} target="_blank" rel="noreferrer">Download</a>
                      </p>
                    ) : null}
                    <small className="applicant-date">Applied {new Date(app.createdAt).toLocaleDateString()}</small>
                  </div>
                );
              })}
            </div>
            <button type="button" className="submit-btn download-btn" onClick={handleDownload}>
              Download Applicant Data (Excel)
            </button>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="small-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Counselor Dashboard
   ══════════════════════════════════════════ */

function CounselorJobDashboard({ currentUser, jobs, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [viewApplicantsJob, setViewApplicantsJob] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState("");

  const myJobs = useMemo(() => jobs.filter((j) => j.postedBy?.id === currentUser?.id), [jobs, currentUser]);

  const handleDeleteConfirm = async () => {
    const id = confirmDelete?.id;
    if (!id) return;
    setDeletingId(id);
    setError("");
    try {
      await deleteJobRequest(id);
      setConfirmDelete(null);
      onRefresh();
    } catch (err) {
      setError(err.message || "Could not delete job");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="counselor-job-dashboard">
      <div className="jobs-title-row">
        <h3>My Postings</h3>
        <button type="button" className="submit-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close Form" : "Post a Job"}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {showForm ? (
        <PostJobForm
          onCreated={() => {
            setShowForm(false);
            onRefresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      {myJobs.length === 0 ? (
        <p className="empty-text">You haven't posted any jobs yet.</p>
      ) : (
        <div className="job-grid">
          {myJobs.map((job) => {
            const closed = isDeadlinePassed(job.applicationDeadline);
            return (
              <article className={`job-card ${closed ? "job-card-closed" : ""}`} key={job.id}>
                <div className="job-card-head">
                  <span className="job-company">{job.company}</span>
                  {closed ? <span className="job-badge badge-closed">Application Closed</span> : null}
                </div>
                <h4>{job.title}</h4>
                <p className="job-location">{job.location}</p>
                {job.salary ? <p className="job-salary">{job.salary}</p> : null}
                <p className="job-desc">{job.description}</p>
                {job.tags?.length ? (
                  <div className="chip-row">
                    {job.tags.map((t) => (
                      <span key={t} className="interest-chip">#{t}</span>
                    ))}
                  </div>
                ) : null}
                <p className="job-deadline">Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</p>
                <div className="job-actions">
                  <button type="button" className="small-btn job-view-btn" onClick={() => setViewApplicantsJob(job)}>
                    View Applicants
                  </button>
                  <button
                    type="button"
                    className="small-btn danger-btn"
                    disabled={deletingId === job.id}
                    onClick={() => setConfirmDelete({ id: job.id, title: job.title })}
                  >
                    {deletingId === job.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewApplicantsJob ? <ApplicantViewer job={viewApplicantsJob} onClose={() => setViewApplicantsJob(null)} /> : null}

      {confirmDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h4>Delete job posting?</h4>
            <p>Are you sure you want to delete &ldquo;{confirmDelete.title}&rdquo;? This cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="small-btn" onClick={() => setConfirmDelete(null)} disabled={deletingId === confirmDelete.id}>Cancel</button>
              <button type="button" className="small-btn danger-btn" disabled={deletingId === confirmDelete.id} onClick={handleDeleteConfirm}>
                {deletingId === confirmDelete.id ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════
   Job Seeker View
   ══════════════════════════════════════════ */

function JobSeekerJobView({ currentUser, jobs, allJobsCount = 0, hasFilters = false, clearFilters }) {
  const [applyJob, setApplyJob] = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("ccp_saved_jobs") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [myApps, setMyApps] = useState([]);
  const [tab, setTab] = useState("browse");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await listMyApplicationsRequest();
        setMyApps(data.applications || []);
        setAppliedIds(new Set((data.applications || []).map((a) => (typeof a.jobId === "object" ? a.jobId.id : a.jobId))));
      } catch {
        /* silent */
      }
    })();
  }, []);

  const toggleSave = (jobId) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      localStorage.setItem("ccp_saved_jobs", JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="seeker-job-view">
      <div className="counseling-tabs">
        <button type="button" className={`tab-btn ${tab === "browse" ? "tab-active" : ""}`} onClick={() => setTab("browse")}>
          Browse Jobs
        </button>
        <button type="button" className={`tab-btn ${tab === "applied" ? "tab-active" : ""}`} onClick={() => setTab("applied")}>
          My Applications
        </button>
        <button type="button" className={`tab-btn ${tab === "saved" ? "tab-active" : ""}`} onClick={() => setTab("saved")}>
          Saved Jobs
        </button>
      </div>

      {success ? <div className="success-banner">{success}</div> : null}

      {tab === "browse" ? (
        jobs.length === 0 ? (
          hasFilters ? (
            <div className="empty-filter-state">
              <p className="empty-text">No jobs match your current filters.</p>
              <button type="button" className="small-btn" onClick={clearFilters}>Clear Filters</button>
            </div>
          ) : (
            <p className="empty-text">{allJobsCount === 0 ? "No jobs posted yet." : "No jobs to show."}</p>
          )
        ) : (
          <div className="job-grid">
            {jobs.map((job) => {
              const closed = isDeadlinePassed(job.applicationDeadline);
              const alreadyApplied = appliedIds.has(job.id);
              const isSaved = savedIds.has(job.id);
              return (
                <article className={`job-card ${closed ? "job-card-closed" : ""}`} key={job.id}>
                  <div className="job-card-head">
                    <span className="job-company">{job.company}</span>
                    <div className="job-badges">
                      {isNewPosting(job.createdAt) && !closed ? <span className="job-badge badge-new">New Posting</span> : null}
                      {closed ? <span className="job-badge badge-closed">Application Closed</span> : null}
                    </div>
                  </div>
                  <h4>{job.title}</h4>
                  <p className="job-location">{job.location}</p>
                  {job.salary ? <p className="job-salary">{job.salary}</p> : null}
                  <p className="job-desc">{job.description}</p>
                  {job.tags?.length ? (
                    <div className="chip-row">
                      {job.tags.map((t) => (
                        <span key={t} className="interest-chip">#{t}</span>
                      ))}
                    </div>
                  ) : null}
                  <p className="job-deadline">Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</p>
                  <div className="job-card-meta">
                    <small>Posted by {job.postedBy?.fullName || "Counselor"}</small>
                  </div>
                  <div className="job-actions">
                    {!closed && !alreadyApplied ? (
                      <button type="button" className="submit-btn" onClick={() => setApplyJob(job)}>
                        Apply Now
                      </button>
                    ) : alreadyApplied ? (
                      <span className="job-applied-label">Applied</span>
                    ) : null}
                    <button
                      type="button"
                      className={`small-btn save-btn ${isSaved ? "save-btn-active" : ""}`}
                      onClick={() => toggleSave(job.id)}
                    >
                      {isSaved ? "Saved ★" : "Save Job ☆"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : tab === "applied" ? (
        myApps.length === 0 ? (
          <p className="empty-text">You haven't applied to any jobs yet.</p>
        ) : (
          <div className="job-grid">
            {myApps.map((app) => {
              const j = app.jobId || {};
              return (
                <article className="job-card" key={app.id}>
                  <div className="job-card-head">
                    <span className="job-company">{j.company || ""}</span>
                    <span className={`status-badge badge-${app.status}`}>{app.status}</span>
                  </div>
                  <h4>{j.title || "Job"}</h4>
                  <p className="job-location">{j.location || ""}</p>
                  {app.coverLetter ? <p className="job-desc">{app.coverLetter}</p> : null}
                  <small>Applied {new Date(app.createdAt).toLocaleDateString()}</small>
                </article>
              );
            })}
          </div>
        )
      ) : (
        (() => {
          const saved = jobs.filter((j) => savedIds.has(j.id));
          return saved.length === 0 ? (
            <p className="empty-text">No saved jobs.</p>
          ) : (
            <div className="job-grid">
              {saved.map((job) => {
                const closed = isDeadlinePassed(job.applicationDeadline);
                return (
                  <article className={`job-card ${closed ? "job-card-closed" : ""}`} key={job.id}>
                    <div className="job-card-head">
                      <span className="job-company">{job.company}</span>
                      {closed ? <span className="job-badge badge-closed">Application Closed</span> : null}
                    </div>
                    <h4>{job.title}</h4>
                    <p className="job-location">{job.location}</p>
                    {job.salary ? <p className="job-salary">{job.salary}</p> : null}
                    <p className="job-deadline">Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</p>
                    <div className="job-actions">
                      <button type="button" className="small-btn save-btn save-btn-active" onClick={() => toggleSave(job.id)}>
                        Unsave ★
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          );
        })()
      )}

      {applyJob ? (
        <ApplyModal
          job={applyJob}
          currentUser={currentUser}
          onClose={() => setApplyJob(null)}
          onApplied={() => {
            setAppliedIds((prev) => new Set([...prev, applyJob.id]));
            setApplyJob(null);
            setSuccess("Application submitted!");
            setTimeout(() => setSuccess(""), 4000);
            listMyApplicationsRequest().then((d) => setMyApps(d.applications || [])).catch(() => {});
          }}
        />
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main JobsPage
   ══════════════════════════════════════════ */

function JobsPage({ currentUser }) {
  const [allJobs, setAllJobs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");

  const hasFilters = search.trim() !== "" || locationSearch.trim() !== "" || activeTag !== "";

  /* Load all jobs once, then filter client-side for instant UX */
  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listJobsRequest();
      setAllJobs(data.jobs || []);
    } catch (err) {
      setError(err.message || "Could not load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  /* Client-side filtering — no disappearing jobs */
  useEffect(() => {
    let filtered = allJobs;

    if (activeTag) {
      const tagLower = activeTag.toLowerCase();
      filtered = filtered.filter((j) =>
        j.tags?.some((t) => t.toLowerCase() === tagLower) ||
        j.title?.toLowerCase().includes(tagLower) ||
        j.location?.toLowerCase().includes(tagLower) ||
        j.description?.toLowerCase().includes(tagLower)
      );
    }

    const searchTerm = search.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter((j) =>
        j.title?.toLowerCase().includes(searchTerm) ||
        j.company?.toLowerCase().includes(searchTerm) ||
        j.description?.toLowerCase().includes(searchTerm) ||
        j.tags?.some((t) => t.toLowerCase().includes(searchTerm))
      );
    }

    const locTerm = locationSearch.trim().toLowerCase();
    if (locTerm) {
      filtered = filtered.filter((j) =>
        j.location?.toLowerCase().includes(locTerm)
      );
    }

    setJobs(filtered);
  }, [allJobs, search, locationSearch, activeTag]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.();
    /* filtering is reactive via useEffect — this prevents form reload */
  };

  const clearFilters = () => {
    setSearch("");
    setLocationSearch("");
    setActiveTag("");
  };

  const isCounselor = currentUser?.role === "career_counselor";

  return (
    <section className="jobs-page">
      <div className="jobs-header">
        <h2>Jobs</h2>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className="jobs-search-bar" onSubmit={handleSearchSubmit}>
        <div className="jobs-search-field">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search jobs by title or keyword"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="jobs-search-field">
          <span className="search-icon">📍</span>
          <input
            type="text"
            placeholder="City or Zip"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="submit-btn search-btn">
          Search
        </button>
      </form>

      <div className="quick-tags">
        {quickTags.map((tag) => (
          <button
            type="button"
            key={tag}
            className={`quick-tag ${activeTag === tag ? "quick-tag-active" : ""}`}
            onClick={() => setActiveTag((prev) => (prev === tag ? "" : tag))}
          >
            {tag}
          </button>
        ))}
        {hasFilters ? (
          <button type="button" className="quick-tag clear-filters-btn" onClick={clearFilters}>
            ✕ Clear Filters
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="empty-text">Loading jobs...</p>
      ) : isCounselor ? (
        <CounselorJobDashboard currentUser={currentUser} jobs={jobs} onRefresh={fetchJobs} />
      ) : (
        <JobSeekerJobView currentUser={currentUser} jobs={jobs} allJobsCount={allJobs.length} hasFilters={hasFilters} clearFilters={clearFilters} />
      )}
    </section>
  );
}

export default JobsPage;
