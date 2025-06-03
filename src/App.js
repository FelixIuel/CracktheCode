// This is the main entry point for the Crack the Code React application.
// It sets up the overall structure, routing, and global UI logic for the app.

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GamePage from './GamePage';
import ExplanationPage from './ExplanationPage';
import ScoreboardPage from './ScoreboardPage';
import DailyPuzzlePage from './DailyPuzzlePage';
import CategoriesPage from './CategoriesPage';
import Header from './Header';
import PlayerPage from './Player/PlayerPage';
import PublicPlayerPage from './Player/PublicPlayerPage';
import angryImage from './assets/pictures/general/fullscreen-warning.png';

function App() {
  // State for controlling login/signup modals and fullscreen warning
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [notFullscreen, setNotFullscreen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Handlers for showing login/signup modals
  const handleLoginClick = () => {
    setShowSignup(false);
    setShowLogin(true);
  };

  const handleSignupClick = () => {
    setShowLogin(false);
    setShowSignup(true);
  };

  // Effect to check authentication and fullscreen status on mount and resize
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && token.trim() && token !== "null" && token !== "undefined") {
      setIsLoggedIn(true);
    }

    // Check if window is large enough for fullscreen experience
    const checkFullscreen = () => {
      const isFullscreen = window.innerWidth >= 1024 && window.innerHeight >= 640;
      setNotFullscreen(!isFullscreen);
    };

    checkFullscreen();
    window.addEventListener('resize', checkFullscreen);
    return () => window.removeEventListener('resize', checkFullscreen);
  }, []);

  return (
    <Router>
      <div>
        {/* Header with login/signup controls */}
        <Header
          onLoginClick={handleLoginClick}
          onSignupClick={handleSignupClick}
          showLoginModal={showLogin}
          setShowLoginModal={setShowLogin}
          showSignupModal={showSignup}
          setShowSignupModal={setShowSignup}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
        />

        {/* Fullscreen warning overlay */}
        {notFullscreen && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'black',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}>
            <img src={angryImage} alt="Fullscreen Warning" style={{ maxWidth: '400px', marginBottom: '20px' }} />
            <p style={{
              fontSize: '20px',
              fontFamily: 'sans-serif',
              textAlign: 'center'
            }}>
              For the best experience, please switch to full screen.
            </p>
          </div>
        )}

        {/* Application routes */}
        <Routes>
          <Route path="/" element={<GamePage onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} isLoggedIn={isLoggedIn} />} />
          <Route path="/explanation" element={<ExplanationPage />} />
          <Route path="/scoreboard" element={<ScoreboardPage onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} isLoggedIn={isLoggedIn} />} />
          <Route path="/daily" element={<DailyPuzzlePage onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} isLoggedIn={isLoggedIn} />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/profile" element={<PlayerPage onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} isLoggedIn={isLoggedIn} />} />
          <Route path="/player/:username" element={<PublicPlayerPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
