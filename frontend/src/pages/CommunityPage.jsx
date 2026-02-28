import { useEffect, useState } from "react";

import {
  listPostsRequest,
  createPostRequest,
  likePostRequest,
  deletePostRequest,
  listRepliesRequest,
  createReplyRequest,
  likeReplyRequest,
  deleteReplyRequest,
} from "../api/communityApi";

/* ── constants ── */

const categories = [
  { value: "all", label: "All Topics" },
  { value: "resume_interview", label: "Resume & Interview Prep" },
  { value: "industry_insights", label: "Industry Insights" },
  { value: "networking_tips", label: "Networking Tips" },
  { value: "general", label: "General Discussion" },
];

const categoryLabels = {
  resume_interview: "Resume & Interview Prep",
  industry_insights: "Industry Insights",
  networking_tips: "Networking Tips",
  general: "General Discussion",
};

const categoryColors = {
  resume_interview: "#e07b00",
  industry_insights: "#0d8a72",
  networking_tips: "#6c3cc9",
  general: "#1a73e8",
};

/* ══════════════════════════════════════════
   Create Post Modal
   ══════════════════════════════════════════ */

function CreatePostModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createPostRequest({ title: title.trim(), body: body.trim(), category });
      onCreated();
    } catch (err) {
      setError(err.message || "Could not create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card community-create-modal" role="dialog" aria-modal="true">
        <h4>Start a Topic</h4>
        {error ? <div className="error-banner">{error}</div> : null}
        <form className="community-create-form" onSubmit={handleSubmit}>
          <input
            required
            maxLength={200}
            placeholder="Title (e.g. Tips for STAR method behavioral answers)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            required
            maxLength={5000}
            rows={6}
            placeholder="Write your post..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.filter((c) => c.value !== "all").map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="modal-actions">
            <button type="button" className="small-btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Posting..." : "Post Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Thread Detail View (with replies)
   ══════════════════════════════════════════ */

function ThreadView({ post, currentUser, onBack, onPostUpdated }) {
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [localPost, setLocalPost] = useState(post);

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const data = await listRepliesRequest(post.id);
      setReplies(data.replies || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReplies(false);
    }
  };

  useEffect(() => {
    loadReplies();
  }, [post.id]);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await createReplyRequest(post.id, { body: replyBody.trim() });
      setReplyBody("");
      await loadReplies();
      setLocalPost((p) => ({ ...p, repliesCount: p.repliesCount + 1 }));
      onPostUpdated({ ...localPost, repliesCount: localPost.repliesCount + 1 });
    } catch (err) {
      setError(err.message || "Could not add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async () => {
    try {
      const data = await likePostRequest(post.id);
      setLocalPost((p) => {
        const newLikedBy = data.liked
          ? [...p.likedBy, currentUser.id]
          : p.likedBy.filter((id) => id !== currentUser.id);
        return { ...p, likesCount: data.likesCount, likedBy: newLikedBy };
      });
    } catch {
      /* silent */
    }
  };

  const handleLikeReply = async (replyId) => {
    try {
      const data = await likeReplyRequest(replyId);
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId
            ? {
                ...r,
                likesCount: data.likesCount,
                likedBy: data.liked
                  ? [...r.likedBy, currentUser.id]
                  : r.likedBy.filter((id) => id !== currentUser.id),
              }
            : r
        )
      );
    } catch {
      /* silent */
    }
  };

  const handleDeleteReply = async (replyId) => {
    try {
      await deleteReplyRequest(replyId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setLocalPost((p) => ({ ...p, repliesCount: Math.max(0, p.repliesCount - 1) }));
    } catch (err) {
      setError(err.message);
    }
  };

  const authorDisplay = (author) => {
    if (!author || typeof author === "string") return "User";
    return author.fullName || "User";
  };

  const authorAvatar = (author) => {
    if (!author || typeof author === "string") return null;
    if (author.profileImageUrl) {
      return <img className="comm-avatar-img" src={author.profileImageUrl} alt="" />;
    }
    return <span className="comm-avatar-placeholder">{(author.fullName || "U")[0]}</span>;
  };

  const postLiked = localPost.likedBy?.includes(currentUser?.id);
  const isAuthor = (authorObj) =>
    authorObj && typeof authorObj === "object" && authorObj.id === currentUser?.id;

  return (
    <div className="thread-view">
      <button type="button" className="small-btn thread-back-btn" onClick={onBack}>
        ← Back to Forum
      </button>

      <article className="thread-main-card">
        <div className="thread-head">
          <span className="comm-category-tag" style={{ background: categoryColors[localPost.category] || "#1a73e8" }}>
            #{categoryLabels[localPost.category] || localPost.category}
          </span>
          <span className="thread-date">{new Date(localPost.createdAt).toLocaleDateString()}</span>
        </div>
        <h3 className="thread-title">{localPost.title}</h3>
        <div className="thread-author-row">
          {authorAvatar(localPost.author)}
          <span className="thread-author-name">{authorDisplay(localPost.author)}</span>
          {localPost.author?.role === "career_counselor" ? <span className="role-badge">Counselor</span> : null}
        </div>
        <p className="thread-body">{localPost.body}</p>
        <div className="thread-stats">
          <button
            type="button"
            className={`stat-btn ${postLiked ? "stat-btn-active" : ""}`}
            onClick={handleLikePost}
          >
            ♥ {localPost.likesCount}
          </button>
          <span className="stat-item">💬 {localPost.repliesCount}</span>
          <span className="stat-item">👁 {localPost.viewsCount}</span>
        </div>
      </article>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="replies-section">
        <h4 className="replies-heading">Replies ({replies.length})</h4>

        {loadingReplies ? (
          <p className="empty-text">Loading replies...</p>
        ) : replies.length === 0 ? (
          <p className="empty-text">No replies yet. Be the first to respond!</p>
        ) : (
          <div className="replies-list">
            {replies.map((reply) => {
              const replyLiked = reply.likedBy?.includes(currentUser?.id);
              return (
                <div className="reply-card" key={reply.id}>
                  <div className="reply-author-row">
                    {authorAvatar(reply.author)}
                    <span className="reply-author-name">{authorDisplay(reply.author)}</span>
                    {reply.author?.role === "career_counselor" ? <span className="role-badge">Counselor</span> : null}
                    <span className="reply-date">{new Date(reply.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="reply-body">{reply.body}</p>
                  <div className="reply-actions">
                    <button
                      type="button"
                      className={`stat-btn ${replyLiked ? "stat-btn-active" : ""}`}
                      onClick={() => handleLikeReply(reply.id)}
                    >
                      ♥ {reply.likesCount}
                    </button>
                    {isAuthor(reply.author) || currentUser?.role === "admin" ? (
                      <button type="button" className="small-btn danger-btn" onClick={() => handleDeleteReply(reply.id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form className="reply-form" onSubmit={handleReplySubmit}>
          <textarea
            placeholder="Write a reply..."
            maxLength={3000}
            rows={3}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            required
          />
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Posting..." : "Reply"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Community Page (main)
   ══════════════════════════════════════════ */

function CommunityPage({ currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const query = {};
      if (search.trim()) query.search = search.trim();
      if (activeCategory !== "all") query.category = activeCategory;
      const data = await listPostsRequest(query);
      setPosts(data.posts || []);
    } catch (err) {
      setError(err.message || "Could not load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeCategory]);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    loadPosts();
  };

  const handleLike = async (postId) => {
    try {
      const data = await likePostRequest(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likesCount: data.likesCount,
                likedBy: data.liked
                  ? [...p.likedBy, currentUser.id]
                  : p.likedBy.filter((id) => id !== currentUser.id),
              }
            : p
        )
      );
    } catch {
      /* silent */
    }
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete?.id;
    if (!id) return;
    setDeletingId(id);
    setError("");
    try {
      await deletePostRequest(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.message || "Could not delete post");
    } finally {
      setDeletingId("");
    }
  };

  /* ── if a thread is selected, show detail view ── */
  if (selectedPost) {
    return (
      <section className="community-page">
        <ThreadView
          post={selectedPost}
          currentUser={currentUser}
          onBack={() => {
            setSelectedPost(null);
            loadPosts();
          }}
          onPostUpdated={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
          }}
        />
      </section>
    );
  }

  /* ── main feed view ── */
  return (
    <section className="community-page">
      <div className="community-header">
        <h2>Community Forum</h2>
        <button type="button" className="submit-btn community-new-btn" onClick={() => setShowCreate(true)}>
          + Start a Topic
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className="community-search-bar" onSubmit={handleSearch}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search discussions, topics, or people"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="submit-btn search-btn">Search</button>
      </form>

      <div className="community-layout">
        <aside className="community-categories">
          <h3>Categories</h3>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.value}
              className={`category-card ${activeCategory === cat.value ? "category-active" : ""}`}
              style={activeCategory === cat.value ? { borderColor: categoryColors[cat.value] || "#1a73e8" } : {}}
              onClick={() => setActiveCategory(cat.value)}
            >
              <span
                className="category-dot"
                style={{ background: categoryColors[cat.value] || "#1a73e8" }}
              />
              {cat.label}
            </button>
          ))}
        </aside>

        <div className="community-feed">
          {loading ? (
            <p className="empty-text">Loading discussions...</p>
          ) : posts.length === 0 ? (
            <p className="empty-text">No discussions found. Start the first one!</p>
          ) : (
            posts.map((post) => {
              const liked = post.likedBy?.includes(currentUser?.id);
              const isOwner = post.author?.id === currentUser?.id;
              return (
                <article className="community-card" key={post.id}>
                  <div className="comm-card-head">
                    <span
                      className="comm-category-tag"
                      style={{ background: categoryColors[post.category] || "#1a73e8" }}
                    >
                      #{categoryLabels[post.category] || post.category}
                    </span>
                    <span className="comm-date">{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>

                  <h4
                    className="comm-card-title"
                    onClick={() => setSelectedPost(post)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedPost(post)}
                  >
                    {post.title}
                  </h4>

                  <p className="comm-card-snippet">
                    {post.body.length > 160 ? post.body.slice(0, 160) + "..." : post.body}
                  </p>

                  <div className="comm-card-footer">
                    <div className="comm-author-row">
                      {post.author?.profileImageUrl ? (
                        <img className="comm-avatar-img" src={post.author.profileImageUrl} alt="" />
                      ) : (
                        <span className="comm-avatar-placeholder">
                          {(post.author?.fullName || "U")[0]}
                        </span>
                      )}
                      <span className="comm-author-name">
                        {post.author?.fullName || "User"}
                      </span>
                      {post.author?.role === "career_counselor" ? <span className="role-badge">Counselor</span> : null}
                    </div>

                    <div className="comm-stats">
                      <button
                        type="button"
                        className={`stat-btn ${liked ? "stat-btn-active" : ""}`}
                        onClick={() => handleLike(post.id)}
                      >
                        ♥ {post.likesCount}
                      </button>
                      <span className="stat-item">💬 {post.repliesCount}</span>
                      <span className="stat-item">👁 {post.viewsCount}</span>
                    </div>
                  </div>

                  <div className="comm-card-actions">
                    <button type="button" className="submit-btn comm-join-btn" onClick={() => setSelectedPost(post)}>
                      Join Discussion
                    </button>
                    {isOwner || currentUser?.role === "admin" ? (
                      <button
                        type="button"
                        className="small-btn danger-btn"
                        disabled={deletingId === post.id}
                        onClick={() => setConfirmDelete({ id: post.id, title: post.title })}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {showCreate ? (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadPosts();
          }}
        />
      ) : null}

      {confirmDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true">
            <h4>Delete post?</h4>
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
    </section>
  );
}

export default CommunityPage;
