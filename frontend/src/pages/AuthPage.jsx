import { useMemo, useState } from "react";
import { loginRequest, signupRequest } from "../api/authApi";

const initialSignupState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "job_seeker",
};

const initialLoginState = {
  email: "",
  password: "",
};

function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("signup");
  const [signupForm, setSignupForm] = useState(initialSignupState);
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (mode === "signup" ? "Create your CareerFlow account" : "Welcome to CareerFlow"),
    [mode]
  );

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await signupRequest(signupForm);
      setMessage("Signup successful. Please login.");
      setSignupForm(initialSignupState);
      setMode("login");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await loginRequest(loginForm);
      localStorage.setItem("ccp_token", data.token);
      localStorage.setItem("ccp_user", JSON.stringify(data.user));
      onLoginSuccess(data.user);
      setLoginForm(initialLoginState);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="auth-card">
        <h1>CareerFlow</h1>
        <p className="subtitle">First milestone: Signup & Login</p>

        <div className="mode-switch">
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
            type="button"
          >
            Signup
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
        </div>

        <h2>{title}</h2>

        {mode === "signup" ? (
          <form onSubmit={handleSignupSubmit} className="form-grid">
            <label htmlFor="signup-fullName">
              Full Name
              <input
                id="signup-fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={signupForm.fullName}
                onChange={(event) =>
                  setSignupForm((previous) => ({ ...previous, fullName: event.target.value }))
                }
              />
            </label>

            <label htmlFor="signup-email">
              Email
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm((previous) => ({ ...previous, email: event.target.value }))
                }
              />
            </label>

            <label htmlFor="signup-password">
              Password
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={signupForm.password}
                onChange={(event) =>
                  setSignupForm((previous) => ({ ...previous, password: event.target.value }))
                }
              />
            </label>

            <label htmlFor="signup-confirmPassword">
              Confirm Password
              <input
                id="signup-confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={signupForm.confirmPassword}
                onChange={(event) =>
                  setSignupForm((previous) => ({ ...previous, confirmPassword: event.target.value }))
                }
              />
            </label>

            <label htmlFor="signup-role">
              Role
              <select
                id="signup-role"
                name="role"
                value={signupForm.role}
                onChange={(event) =>
                  setSignupForm((previous) => ({ ...previous, role: event.target.value }))
                }
              >
                <option value="job_seeker">Job Seeker</option>
                <option value="career_counselor">Career Counselor</option>
              </select>
            </label>

            <button disabled={loading} type="submit" className="submit-btn">
              {loading ? "Submitting..." : "Create Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="form-grid">
            <label htmlFor="login-email">
              Email
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((previous) => ({ ...previous, email: event.target.value }))
                }
              />
            </label>

            <label htmlFor="login-password">
              Password
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((previous) => ({ ...previous, password: event.target.value }))
                }
              />
            </label>

            <button disabled={loading} type="submit" className="submit-btn">
              {loading ? "Submitting..." : "Login"}
            </button>
          </form>
        )}

        {message ? <p className="message success">{message}</p> : null}
        {error ? <p className="message error">{error}</p> : null}
      </section>
    </main>
  );
}

export default AuthPage;
