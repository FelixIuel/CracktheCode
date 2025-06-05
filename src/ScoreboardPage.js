// Script component for displaying the user's scores and the global top scores with pagination.
// Handles fetching, displaying, and expanding score details, as well as guest prompts and error handling.

import React, { useEffect, useState } from "react";
import "./ScoreboardPage.css";
import backgroundImg from "./assets/pictures/scoreboard/scorebook-background.png";
import questionImage from "./assets/pictures/scoreboard/guest-question.png";
import arrowDown from "./assets/pictures/scoreboard/arrow-down.png";
import arrowUp from "./assets/pictures/scoreboard/arrow-up.png";
import arrowLeft from "./assets/pictures/scoreboard/arrow-left.png";
import arrowRight from "./assets/pictures/scoreboard/arrow-right.png";
import pageTurnSound from "./assets/sounds/scoreboard/page-turn.mp3";

const ScoreboardPage = ({ onLoginClick, onSignupClick, isLoggedIn }) => {
  // State for user's scores, top scores, expanded entry, pagination, and error
  const [myScores, setMyScores] = useState([]);
  const [topScores, setTopScores] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [myPage, setMyPage] = useState(0);
  const [topPage, setTopPage] = useState(0);
  const [scoresPerPage, setScoresPerPage] = useState(30);
  const [loadError, setLoadError] = useState(false);
  const audio = new Audio(pageTurnSound);

  // Fetch top scores and user's scores on mount or login state change
  useEffect(() => {
    fetch("http://127.0.0.1:5000/get-highscores")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTopScores(data.highscores);
      });

    if (isLoggedIn) {
      const token = localStorage.getItem("token");
      fetch("http://127.0.0.1:5000/loggedin-player-scores", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Sort user's scores in descending order
            const sorted = [...data.scores].sort((a, b) => b.score - a.score);
            setMyScores(sorted);
            setLoadError(false);
          } else {
            setMyScores([]);
            setLoadError(true);
          }
        })
        .catch(() => {
          setMyScores([]);
          setLoadError(true);
        });
    } else {
      setMyScores([]);
      setLoadError(false);
    }
  }, [isLoggedIn]);

  // Dynamically calculate how many scores fit per page based on window height
  useEffect(() => {
    const calculateScoresPerPage = () => {
      const availableHeight = window.innerHeight - 260;
      const approxRowHeight = 20;
      const count = Math.floor(availableHeight / approxRowHeight);
      setScoresPerPage(count);
    };

    calculateScoresPerPage();
    window.addEventListener("resize", calculateScoresPerPage);
    return () => window.removeEventListener("resize", calculateScoresPerPage);
  }, []);

  // Handle page change for either user's or top scores, with sound effect
  const handlePageChange = (type, direction) => {
    audio.play();
    setTimeout(() => {
      if (type === "my") {
        setMyPage((prev) => Math.max(0, prev + direction));
      } else if (type === "top") {
        setTopPage((prev) => Math.max(0, prev + direction));
      }
    }, 500);
  };

  // Toggle expanded state for score details
  const toggleExpand = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  // Paginate scores for current page
  const myPaginated = myScores.slice(myPage * scoresPerPage, (myPage + 1) * scoresPerPage);
  const topPaginated = topScores.slice(topPage * scoresPerPage, (topPage + 1) * scoresPerPage);

  return (
    <div className="scoreboard-page-wrapper">
      <div className="scoreboard-background-wrapper">
        <img src={backgroundImg} alt="Notebook" className="scoreboard-background-image" />
        <div className="scoreboard-overlay">
          <div className="score-column left">
            {isLoggedIn ? (
              <>
                <div className="score-header"><h1>My Scores</h1></div>
                {loadError && (
                  <div className="error-message" style={{ color: "red", margin: "16px 0" }}>
                    Could not load your scores. Try logging out and in again.
                  </div>
                )}
                <div className="score-list">
                  {myPaginated.map((entry, index) => {
                    const realIndex = myPage * scoresPerPage + index;
                    const hasTimestamp = !!entry.timestamp;
                    return (
                      <div key={realIndex} className="score-entry">
                        <div className="score-line">
                          #{realIndex + 1} — {entry.score} points
                          <img
                            src={expandedIndex === realIndex ? arrowUp : arrowDown}
                            alt="toggle"
                            className="expand-icon"
                            onClick={() => toggleExpand(realIndex)}
                          />
                        </div>
                        {expandedIndex === realIndex && (
                          <div className="score-details">
                            Played: {hasTimestamp ? new Date(entry.timestamp).toLocaleString() : "Unknown"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="arrow-controls">
                  {/* Show left arrow if not on first page */}
                  {myPage > 0 && (
                    <img
                      src={arrowLeft}
                      className="arrow-button"
                      onClick={() => handlePageChange("my", -1)}
                      alt="Previous"
                    />
                  )}
                  {/* Show right arrow if more pages exist */}
                  {myScores.length > (myPage + 1) * scoresPerPage && (
                    <img
                      src={arrowRight}
                      className="arrow-button"
                      onClick={() => handlePageChange("my", 1)}
                      alt="Next"
                    />
                  )}
                </div>
              </>
            ) : (
              // Guest prompt if not logged in
              <div className="guest-prompt-wrapper">
                <img src={questionImage} alt="Guest" className="guest-image" />
                <div className="guest-text">
                  Please <span onClick={onLoginClick}>log in</span> or{" "}
                  <span onClick={onSignupClick}>sign up</span> to view your scores
                </div>
              </div>
            )}
          </div>

          <div className="score-column right">
            <div className="score-header"><h1>Top Players</h1></div>
            <div className="score-list">
              {topPaginated.map((entry, index) => (
                <div key={index} className="score-entry">
                  #{topPage * scoresPerPage + index + 1} — {entry.username || "Unknown"}: {entry.score} points
                </div>
              ))}
            </div>
            <div className="arrow-controls">
              {/* Show left arrow if not on first page */}
              {topPage > 0 && (
                <img
                  src={arrowLeft}
                  className="arrow-button"
                  onClick={() => handlePageChange("top", -1)}
                  alt="Previous"
                />
              )}
              {/* Show right arrow if more pages exist */}
              {topScores.length > (topPage + 1) * scoresPerPage && (
                <img
                  src={arrowRight}
                  className="arrow-button"
                  onClick={() => handlePageChange("top", 1)}
                  alt="Next"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreboardPage;