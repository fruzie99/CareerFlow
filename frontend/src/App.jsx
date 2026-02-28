import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import MainPage from "./pages/MainPage";
import { getProfileRequest } from "./api/authApi";
import "./App.css";

const getCachedUser = () => {
  const rawUser = localStorage.getItem("ccp_user");
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem("ccp_user");
    return null;
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState(getCachedUser);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ccp_token");

    if (!token) {
      setLoadingSession(false);
      return;
    }

    const hydrateSession = async () => {
      try {
        const data = await getProfileRequest();
        localStorage.setItem("ccp_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
      } catch (error) {
        const isUnauthorized = error?.status === 401 || error?.status === 403;

        if (isUnauthorized) {
          localStorage.removeItem("ccp_token");
          localStorage.removeItem("ccp_user");
          setCurrentUser(null);
        }
      } finally {
        setLoadingSession(false);
      }
    };

    hydrateSession();
  }, []);

  const logout = () => {
    localStorage.removeItem("ccp_token");
    localStorage.removeItem("ccp_user");
    setCurrentUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem("ccp_user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  if (loadingSession) {
    return (
      <main className="page">
        <section className="auth-card">
          <h1>CareerFlow</h1>
          <p className="subtitle">Loading your profile...</p>
        </section>
      </main>
    );
  }

  return currentUser ? (
    <MainPage currentUser={currentUser} onLogout={logout} onUserUpdate={handleUserUpdate} />
  ) : (
    <AuthPage onLoginSuccess={setCurrentUser} />
  );
}

export default App;
