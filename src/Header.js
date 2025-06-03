// this script is for the Header component of crack the code game.
// it purposes to handle player authentication, display the header with navigation links, and manage login/signup modals.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from './assets/pictures/general/logo192.png';
import './Header.css';

function Header({
  onLoginClick,
  onSignupClick,
  showLoginModal,
  setShowLoginModal,
  showSignupModal,
  setShowSignupModal,
  isLoggedIn,
  setIsLoggedIn
}) {
  // State for username, password, and feedback message
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState("");

  // Determine if any modal is open and if it's the signup modal
  const isModalOpen = showLoginModal || showSignupModal;
  const isSignup = showSignupModal;

  // On mount, check if a token exists in localStorage to set login state
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
      setIsLoggedIn(true);
    }
  }, [setIsLoggedIn]);

  // Show a temporary feedback message
  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  // Handle login form submission
  const handleLogin = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        setIsLoggedIn(true);
        showMessage("Login successful!");
        setShowLoginModal(false);
      } else {
        showMessage(data.error || "Login failed!");
      }
    } catch (error) {
      console.error('Error logging in:', error);
      showMessage("Something went wrong.");
    }
  };

  // Handle signup form submission
  const handleSignup = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage("Signup successful!");
        setIsLoggedIn(true);
        setShowSignupModal(false);
      } else {
        showMessage(data.error || "Signup failed");
      }
    } catch (error) {
      console.error('Error signing up:', error);
      showMessage("Something went wrong.");
    }
  };

  // Handle logout action
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    showMessage("Logged out");
  };

  return (
    <>
      {/* Feedback message */}
      {message && <div className="header-message">{message}</div>}

      <header className="main-header">
        <div className="logo-title">
          <img src={logo} alt="Logo" />
          <Link to="/">Crack The Code</Link>
        </div>

        {/* Navigation links */}
        <nav className="nav-links">
          <div className="dropdown-wrapper">
            <span className="dropdown-title">Play</span>
            <div className="dropdown-menu">
              <Link to="/" className="dropdown-item">Endless Run</Link>
              <Link to="/daily" className="dropdown-item">Daily Sentence</Link>
              <Link to="/categories" className="dropdown-item">Categories</Link>
            </div>
          </div>

          <Link to="/explanation" className="nav-link">How to Play</Link>
          <Link to="/scoreboard" className="nav-link">Scoreboard</Link>
          <Link to="/profile" className="nav-link">Profile</Link>
        </nav>

        {/* Authentication buttons */}
        <div className="auth-buttons">
          {!isLoggedIn ? (
            <>
              <button onClick={onLoginClick} className="login-btn">Login</button>
              <button onClick={onSignupClick} className="signup-btn">Sign Up</button>
            </>
          ) : (
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          )}
        </div>
      </header>

      {/* Login/Signup modal */}
      {isModalOpen && (
        <div className="auth-modal">
          <h2 style={{ color: 'white', textAlign: 'center' }}>
            {isSignup ? 'Sign Up' : 'Login'}
          </h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="modal-buttons">
            <button
              onClick={isSignup ? handleSignup : handleLogin}
              className="submit-btn"
            >
              {isSignup ? 'Sign Up' : 'Login'}
            </button>
            <button
              onClick={() => {
                setShowLoginModal(false);
                setShowSignupModal(false);
              }}
              className="close-btn"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
