import { useEffect, useMemo, useState } from "react";

import { createResourceRequest, deleteResourceRequest, listResourcesRequest } from "../api/resourceApi";

const initialFilters = {
  search: "",
  type: "",
  category: "",
  sortBy: "newest",
};

const initialCreateState = {
  title: "",
  description: "",
  type: "article",
  category: "resume",
  url: "",
  tagsInput: "",
};

const typeLabels = {
  article: "Article",
  video: "Video",
  template: "Template",
};

const categoryLabels = {
  resume: "Resume",
  interview: "Interview",
  job_search: "Job Search",
};

const MIN_TITLE_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 10;

const normalizeExternalUrl = (value) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (!trimmed.includes(" ") && trimmed.includes(".")) {
    return `https://${trimmed}`;
  }

  return "";
};

function ResourcesPage({ currentUser }) {
  const [filters, setFilters] = useState(initialFilters);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateState);
  const [createLoading, setCreateLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadResources = async (nextFilters = filters) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await listResourcesRequest(nextFilters);
      setResources(data.resources || []);
    } catch (error) {
      setErrorMessage(error.message || "Could not load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources(filters);
  }, [filters.search, filters.type, filters.category, filters.sortBy]);

  const handleCreateChange = (field) => (event) => {
    setErrorMessage("");
    const value = event.target.value;
    setCreateForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setCreateLoading(true);
    setErrorMessage("");

    try {
      const title = createForm.title.trim();
      const description = createForm.description.trim();
      const url = normalizeExternalUrl(createForm.url);
      const tags = createForm.tagsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (!title || title.length < MIN_TITLE_LENGTH) {
        throw new Error(`Title must be at least ${MIN_TITLE_LENGTH} characters.`);
      }

      if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
        throw new Error(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`);
      }

      if (tags.length > 12) {
        throw new Error("Please use at most 12 tags.");
      }

      if (createForm.url.trim() && !url) {
        throw new Error("Please enter a valid resource URL (example: https://example.com).");
      }

      await createResourceRequest({
        title,
        description,
        type: createForm.type,
        category: createForm.category,
        url,
        tags,
      });

      setCreateForm(initialCreateState);
      setShowCreateForm(false);
      await loadResources(filters);
    } catch (error) {
      setErrorMessage(error.message || "Could not create resource");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const resourceId = confirmDelete?.id;
    if (!resourceId) return;

    setErrorMessage("");
    setDeletingId(resourceId);

    try {
      await deleteResourceRequest(resourceId);
      setResources((previous) => previous.filter((item) => item.id !== resourceId));
      setConfirmDelete(null);
    } catch (error) {
      setErrorMessage(error.message || "Could not delete resource");
    } finally {
      setDeletingId("");
    }
  };

  const emptyState = useMemo(() => {
    if (loading) {
      return "Loading resources...";
    }

    if (resources.length) {
      return "";
    }

    return "No resources found. Add your first resource.";
  }, [loading, resources.length]);

  return (
    <section className="resources-page">
      <div className="resources-title-row">
        <h2>Resource Library</h2>
        <span className="resource-count">{resources.length} results</span>
      </div>

      {errorMessage ? (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="resources-topbar">
        <button
          type="button"
          className="submit-btn"
          onClick={() => {
            setErrorMessage("");
            setShowCreateForm((value) => !value);
          }}
        >
          {showCreateForm ? "Close" : "Contribute"}
        </button>

        <input
          type="text"
          value={filters.search}
          placeholder="Search resources by type or tag"
          onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
        />
      </div>

      {showCreateForm ? (
        <form className="resource-create-form" onSubmit={handleCreateSubmit}>
          <input
            required
            minLength={MIN_TITLE_LENGTH}
            maxLength={160}
            value={createForm.title}
            placeholder="Title"
            onChange={handleCreateChange("title")}
          />
          <textarea
            required
            minLength={MIN_DESCRIPTION_LENGTH}
            maxLength={500}
            value={createForm.description}
            placeholder="Description"
            onChange={handleCreateChange("description")}
          />
          <div className="resource-form-row">
            <select
              value={createForm.type}
              onChange={handleCreateChange("type")}
            >
              <option value="article">Article</option>
              <option value="video">Video</option>
              <option value="template">Template</option>
            </select>
            <select
              value={createForm.category}
              onChange={handleCreateChange("category")}
            >
              <option value="resume">Resume</option>
              <option value="interview">Interview</option>
              <option value="job_search">Job Search</option>
            </select>
          </div>
          <input
            value={createForm.url}
            placeholder="Optional URL"
            onChange={handleCreateChange("url")}
          />
          <input
            value={createForm.tagsInput}
            placeholder="Tags (comma separated)"
            onChange={handleCreateChange("tagsInput")}
          />
          <button type="submit" className="submit-btn" disabled={createLoading}>
            {createLoading ? "Saving..." : "Save Resource"}
          </button>
        </form>
      ) : null}

      <div className="resources-layout">
        <aside className="resource-filter-card">
          <h3>Filter by</h3>

          <div className="filter-section">
            {Object.entries(typeLabels).map(([value, label]) => (
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  checked={filters.type === value}
                  onChange={() => setFilters((previous) => ({ ...previous, type: value }))}
                />
                <span>{label}</span>
              </label>
            ))}
            <button type="button" className="tiny-btn" onClick={() => setFilters((previous) => ({ ...previous, type: "" }))}>
              Clear type
            </button>
          </div>

          <h3>Category</h3>
          <div className="filter-section">
            {Object.entries(categoryLabels).map(([value, label]) => (
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  checked={filters.category === value}
                  onChange={() => setFilters((previous) => ({ ...previous, category: value }))}
                />
                <span>{label}</span>
              </label>
            ))}
            <button
              type="button"
              className="tiny-btn"
              onClick={() => setFilters((previous) => ({ ...previous, category: "" }))}
            >
              Clear category
            </button>
          </div>

          <h3>Sort by</h3>
          <div className="filter-section">
            <label className="radio-row">
              <input
                type="radio"
                checked={filters.sortBy === "newest"}
                onChange={() => setFilters((previous) => ({ ...previous, sortBy: "newest" }))}
              />
              <span>Newest</span>
            </label>
            <label className="radio-row">
              <input
                type="radio"
                checked={filters.sortBy === "popular"}
                onChange={() => setFilters((previous) => ({ ...previous, sortBy: "popular" }))}
              />
              <span>Most Popular</span>
            </label>
          </div>
        </aside>

        <section className="resource-grid">
          {emptyState ? <p className="empty-text">{emptyState}</p> : null}
          {resources.map((resource) => {
            const openUrl = normalizeExternalUrl(resource.url || "");
            const isOwner = currentUser?.id && resource.createdBy?.id === currentUser.id;

            return (
              <article className="resource-card" key={resource.id}>
                <div className="resource-card-head">
                  <span className="resource-pill">{typeLabels[resource.type] || resource.type}</span>
                  <span>{categoryLabels[resource.category] || resource.category}</span>
                </div>
                <h4>{resource.title}</h4>
                <p>{resource.description}</p>
                <div className="chip-row">
                  {(resource.tags || []).map((tag) => (
                    <span key={tag} className="interest-chip">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="resource-meta">
                  <small>Contributed by: {resource.createdBy?.fullName || currentUser?.fullName}</small>
                  <small>{new Date(resource.createdAt).toLocaleString()}</small>
                </div>
                <div className="resource-actions">
                  {openUrl ? (
                    <a className="small-btn" href={openUrl} target="_blank" rel="noreferrer">
                      Open Resource
                    </a>
                  ) : (
                    <span className="social-link-disabled">No link attached</span>
                  )}

                  {isOwner ? (
                    <button
                      type="button"
                      className="small-btn danger-btn"
                      disabled={deletingId === resource.id}
                      onClick={() => setConfirmDelete({ id: resource.id, title: resource.title })}
                    >
                      {deletingId === resource.id ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {confirmDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h4>Delete resource?</h4>
            <p>
              Are you sure you want to delete "{confirmDelete.title}"? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="small-btn" onClick={() => setConfirmDelete(null)} disabled={deletingId === confirmDelete.id}>
                Cancel
              </button>
              <button
                type="button"
                className="small-btn danger-btn"
                disabled={deletingId === confirmDelete.id}
                onClick={handleDeleteConfirm}
              >
                {deletingId === confirmDelete.id ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ResourcesPage;
