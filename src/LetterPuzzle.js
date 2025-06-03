// LetterPuzzle.js
// This React component implements a letter puzzle game where users guess letters to solve a sentence.
// It manages game state, user input, hints, scoring, and communicates with a backend for puzzles and score submission.

import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import hintCharacter from "./assets/pictures/gamepage/hint-character.png";
import { v4 as uuidv4 } from "uuid";

const LetterPuzzle = ({ onLoginClick, onSignupClick, isLoggedIn }) => {
  // State variables for game logic and UI
  const [sentence, setSentence] = useState("");
  const [category, setCategory] = useState("");
  const [hint, setHint] = useState("");
  const [letterMapping, setLetterMapping] = useState({});
  const [revealedLetters, setRevealedLetters] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [lives, setLives] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [score, setScore] = useState(0);
  const [usedSentences, setUsedSentences] = useState([]);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [gameSessionId, setGameSessionId] = useState(uuidv4());

  // Refs for tracking correct answers, input elements, timeouts, and auth token
  const correctCount = useRef(0);
  const inputRefs = useRef([]);
  const timeoutRefs = useRef({});
  const tokenRef = useRef(null);

  // On login state change, update the token reference
  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem("token");
      if (token && token !== "undefined" && token !== "null" && token.trim() !== "") {
        tokenRef.current = token;
      }
    } else {
      tokenRef.current = null;
    }
  }, [isLoggedIn]);

  // Fetch a unique puzzle from the backend, avoiding repeats
  const getUniquePuzzle = async () => {
    let attempts = 0;
    while (attempts < 10) {
      const res = await fetch("http://127.0.0.1:5000/get-puzzle");
      const data = await res.json();
      if (!usedSentences.includes(data.sentence)) {
        setUsedSentences((prev) => [...prev, data.sentence]);
        return data;
      }
      attempts++;
    }
    return null;
  };

  // Fetch and set up a new puzzle
  const fetchPuzzle = () => {
    getUniquePuzzle()
      .then((data) => {
        if (!data) return;

        setSentence(data.sentence);
        setCategory(data.category);
        setHint(data.hint);

        // Normalize letter mapping to lowercase
        const normalizedMap = {};
        Object.entries(data.letterMap).forEach(([key, value]) => {
          normalizedMap[key.toLowerCase()] = value;
        });
        setLetterMapping(normalizedMap);

        setRevealedLetters(data.revealedLetters || []);
        setGameOver(false);
        setIsCorrect(false);

        // Prepare the input array, pre-filling revealed letters
        const cleanSentence = data.sentence.replace(/[^a-zA-Z]/g, "");
        const initialInput = Array(cleanSentence.length).fill("");

        data.revealedLetters.forEach((letter) => {
          for (let i = 0; i < cleanSentence.length; i++) {
            if (cleanSentence[i].toLowerCase() === letter.toLowerCase()) {
              initialInput[i] = letter.toLowerCase();
            }
          }
        });

        setUserInput(initialInput);
        inputRefs.current = [];
        timeoutRefs.current = {};
      })
      .catch((err) => console.error("Failed to fetch puzzle", err));
  };

  // Fetch the first puzzle on mount
  useEffect(() => {
    fetchPuzzle();
  }, []);

  // Prepare the correct answer and split sentence into words
  const correctLetters = sentence.replace(/[^a-zA-Z]/g, "").split("");
  const words = sentence.split(" ");

  // Handle user input for each letter box
  const handleChange = (index, value) => {
    if (/^[a-zA-Z]?$/.test(value)) {
      const newInput = [...userInput];
      const lowercase = value.toLowerCase();
      newInput[index] = lowercase;
      setUserInput(newInput);

      const correctLetter = correctLetters[index]?.toLowerCase();

      // If correct letter entered
      if (lowercase === correctLetter) {
        // Clear any pending timeout for this box
        if (timeoutRefs.current[index]) {
          clearTimeout(timeoutRefs.current[index]);
          delete timeoutRefs.current[index];
        }

        // Focus next empty input
        const nextIndex = newInput.findIndex((val, i) => i > index && val === "");
        if (nextIndex !== -1 && inputRefs.current[nextIndex]) {
          inputRefs.current[nextIndex].focus();
        }

        // If the whole answer is correct
        const fullInput = newInput.join("").toLowerCase();
        const correctAnswer = correctLetters.join("").toLowerCase();
        if (fullInput === correctAnswer) {
          setIsCorrect(true);
          setScore((prev) => prev + 1);
          correctCount.current += 1;

          // Award extra life every 3 correct answers
          if (correctCount.current % 3 === 0) {
            setLives((prev) => Math.min(10, prev + 1));
          }

          // Load next puzzle after a short delay
          setTimeout(fetchPuzzle, 2000);
        }

        return;
      }

      // Wrong letter: lose a life and clear input after 1 second
      setLives((prev) => {
        const updated = Math.max(prev - 1, 0);
        if (updated === 0) setGameOver(true);
        return updated;
      });

      if (timeoutRefs.current[index]) {
        clearTimeout(timeoutRefs.current[index]);
      }

      timeoutRefs.current[index] = setTimeout(() => {
        setUserInput((prevInput) => {
          const updated = [...prevInput];
          if (updated[index]?.toLowerCase() !== correctLetter) {
            updated[index] = "";
          }
          return updated;
        });
        delete timeoutRefs.current[index];
      }, 1000);
    }
  };

  // Show a bogus hint from the backend
  const showBogusHint = () => {
    fetch("http://127.0.0.1:5000/get-bogus-hint")
      .then((res) => res.json())
      .then((data) => {
        setHintText(data.text || "No hint available");
        setShowHint(true);
        setTimeout(() => setShowHint(false), 3000);
      })
      .catch((err) => {
        console.error("Failed to fetch bogus hint", err);
      });
  };

  // Reset the game state for a new session
  const handlePlayAgain = () => {
    setGameOver(false);
    setUserInput([]);
    setUsedSentences([]);
    setScore(0);
    correctCount.current = 0;
    setLives(10);
    setScoreSubmitted(false);
    setGameSessionId(uuidv4());
    fetchPuzzle();
  };

  let letterIndex = 0; // Used to track the index of each letter input

  return (
    <div className="game-wrapper">
      {/* Show a message when score is submitted */}
      {scoreSubmitted && (
        <div style={{
          position: "fixed",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#28a745",
          color: "white",
          padding: "10px 20px",
          borderRadius: "6px",
          fontWeight: "bold",
          zIndex: 2000
        }}>
          Score received by the Detective!
        </div>
      )}

      {/* Overlay when game is over */}
      {gameOver && <div className="game-overlay"></div>}

      <div className="game-area">
        <div className="game-header">
          <h2 className="category">{category}</h2>
          <p className="hint">{hint}</p>
        </div>

        {/* Render input boxes for each letter in the sentence */}
        <div className="input-container">
          {words.map((word, wordIndex) => (
            <React.Fragment key={wordIndex}>
              <div className="word-group">
                {word.split("").map((char, i) => {
                  const isLetter = /[a-zA-Z]/.test(char);
                  let currentLetterIndex = null;

                  if (isLetter) {
                    currentLetterIndex = letterIndex;
                    letterIndex++;
                  }

                  return isLetter ? (
                    <div key={`${wordIndex}-${i}`} className="input-box">
                      <input
                        ref={(el) => (inputRefs.current[currentLetterIndex] = el)}
                        type="text"
                        disabled={gameOver}
                        className={
                          userInput[currentLetterIndex] &&
                          userInput[currentLetterIndex].toLowerCase() ===
                            correctLetters[currentLetterIndex]?.toLowerCase()
                            ? "correct-input"
                            : userInput[currentLetterIndex] &&
                              userInput[currentLetterIndex].toLowerCase() !==
                                correctLetters[currentLetterIndex]?.toLowerCase()
                            ? "incorrect"
                            : ""
                        }
                        readOnly={
                          userInput[currentLetterIndex] &&
                          userInput[currentLetterIndex].toLowerCase() ===
                            correctLetters[currentLetterIndex]?.toLowerCase()
                        }
                        maxLength="1"
                        value={userInput[currentLetterIndex]}
                        onChange={(e) =>
                          handleChange(currentLetterIndex, e.target.value)
                        }
                      />
                      {/* Show the number label for this letter */}
                      <span className="number-label">
                        {letterMapping[char.toLowerCase()] || ""}
                      </span>
                      {/* Show error message if wrong letter */}
                      {userInput[currentLetterIndex] &&
                        userInput[currentLetterIndex].toLowerCase() !==
                          correctLetters[currentLetterIndex]?.toLowerCase() && (
                          <span className="error-text">Wrong!</span>
                        )}
                    </div>
                  ) : null;
                })}
              </div>
              {/* Add space between words */}
              {wordIndex < words.length - 1 && (
                <div className="space-box">&nbsp;&nbsp;&nbsp;</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Show success message if answer is correct */}
        {isCorrect && <div className="success-message">Correct!</div>}

        {/* Game over screen with score and options */}
        {gameOver && (
          <div className="game-over-screen full-screen">
            <h2>Game Over!</h2>
            <p>Your score: {score}</p>

            {/* Show login/signup if not logged in, or submit score if logged in */}
            {!isLoggedIn ? (
              <div style={{ marginTop: "10px", color: "gray" }}>
                Log in or sign up to save your score.<br />
                <span
                  style={{
                    color: "#007bff",
                    textDecoration: "underline",
                    cursor: "pointer",
                    marginRight: "10px"
                  }}
                  onClick={onLoginClick}
                >
                  Login
                </span>
                <span
                  style={{
                    color: "#28a745",
                    textDecoration: "underline",
                    cursor: "pointer"
                  }}
                  onClick={onSignupClick}
                >
                  Sign Up
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  fetch("http://127.0.0.1:5000/submit-score", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${tokenRef.current}`
                    },
                    body: JSON.stringify({
                      score,
                      timestamp: new Date().toISOString(),
                      sessionId: gameSessionId,
                    }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      setScoreSubmitted(true);
                      setTimeout(() => setScoreSubmitted(false), 3000);
                    })
                    .catch((err) => {
                      console.error("Failed to submit score", err);
                    });
                }}
              >
                Submit Score
              </button>
            )}

            <button
              onClick={handlePlayAgain}
              style={{
                marginTop: "15px",
                padding: "10px 20px",
                fontWeight: "bold"
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Life bar showing remaining lives */}
      <div className="life-bar centered">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`heart ${i < lives ? "full" : "empty"}`}>
            &#10084;
          </span>
        ))}
      </div>

      {/* Hint character for bogus hints */}
      <div className="hint-character" onClick={showBogusHint}>
        <img
          src={hintCharacter}
          alt="Hint Character"
          className="hint-image"
        />
        <div className="hint-text">Ask me</div>
        {showHint && <div className="speech-bubble">{hintText}</div>}
      </div>
    </div>
  );
};

export default LetterPuzzle;
