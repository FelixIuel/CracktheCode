// This script implements a category-based word puzzle game. 
// Players guess letters in sentences, with hints and a life system, progressing through sentences in a selected category.

import React, { useState, useEffect, useRef } from 'react';
import './CategoriesPage.css';
import hintCharacter from './assets/pictures/gamepage/hint-character.png';
import parchmentImage from './assets/pictures/general/parchment-bg.png';

// Generates a mapping of unique letters to numbers for display under each letter box
const getRandomNumbers = (word) => {
  const numbers = {};
  let counter = 1;
  for (let char of word.toLowerCase()) {
    if (/[a-z]/.test(char) && !numbers[char]) {
      numbers[char] = counter++;
    }
  }
  return numbers;
};

// Messages shown when a category is completed
const categoryMessages = {
  DOTA: "DOTA: You’ve reached divine rank!",
  EARTH: "Earth: What a traveler.",
  "LORUM IPSUM": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  MEDSOE: "Medsoe: Welcome to the team.",
  SCIENCE: "Science: Welcome to the smarty pants club."
};

const CategoriesPuzzle = ({ selectedCategory }) => {
  // State variables for sentences, user input, lives, etc.
  const [sentences, setSentences] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentenceData, setSentenceData] = useState(null);
  const [letterMapping, setLetterMapping] = useState({});
  const [userInput, setUserInput] = useState([]);
  const [lives, setLives] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");

  // Refs for input elements and timeouts
  const inputRefs = useRef([]);
  const timeoutRefs = useRef({});

  // Fetch sentences for the selected category from backend
  useEffect(() => {
    if (!selectedCategory) return;

    fetch(`http://127.0.0.1:5000/get-category/${selectedCategory}`)
      .then((res) => res.json())
      .then((fetchedData) => {
        const formatted = fetchedData.map(item => ({
          sentence: item.sentence,
          hint: item.hint
        }));
        setSentences(formatted);
        setCurrentSentenceIndex(0);
      })
      .catch((err) => {
        console.error("Failed to load category data:", err);
        setSentences([]);
      });
  }, [selectedCategory]);

  // Prepare the current sentence, reveal some letters, and reset state
  useEffect(() => {
    if (sentences.length === 0) return;

    const current = sentences[currentSentenceIndex];
    const cleanAnswer = current.sentence.replace(/[^a-zA-Z]/g, '');
    const initialInput = Array(cleanAnswer.length).fill('');

    // Reveal a few random letters at the start
    const revealCount = Math.min(3, Math.floor(cleanAnswer.length / 4));
    const revealIndices = new Set();
    while (revealIndices.size < revealCount) {
      revealIndices.add(Math.floor(Math.random() * cleanAnswer.length));
    }
    revealIndices.forEach(index => {
      initialInput[index] = cleanAnswer[index].toLowerCase();
    });

    setSentenceData(current);
    setLetterMapping(getRandomNumbers(current.sentence));
    setUserInput(initialInput);
    setLives(10);
    setGameOver(false);
    inputRefs.current = [];
    timeoutRefs.current = {};
  }, [sentences, currentSentenceIndex]);

  // Prepare correct answer and split into words for rendering
  const correctLetters = sentenceData?.sentence.replace(/[^a-zA-Z]/g, '').split('') || [];
  const words = sentenceData?.sentence.split(' ') || [];

  // Handle user input in each letter box
  const handleChange = (index, value) => {
    if (/^[a-zA-Z]?$/.test(value)) {
      const newInput = [...userInput];
      const lowercase = value.toLowerCase();
      newInput[index] = lowercase;
      setUserInput(newInput);

      const correctLetter = correctLetters[index]?.toLowerCase();

      if (lowercase === correctLetter) {
        clearTimeout(timeoutRefs.current[index]);

        // Focus next empty input
        const nextIndex = newInput.findIndex((val, i) => i > index && val === '');
        if (nextIndex !== -1 && inputRefs.current[nextIndex]) {
          inputRefs.current[nextIndex].focus();
        }

        // If sentence is complete, move to next or show popup
        if (newInput.join('') === correctLetters.join('').toLowerCase()) {
          if (currentSentenceIndex + 1 < sentences.length) {
            setTimeout(() => {
              setCurrentSentenceIndex((prev) => prev + 1);
            }, 1500);
          } else {
            setTimeout(() => {
              setPopupMessage(categoryMessages[selectedCategory] || "Category complete!");
              setShowPopup(true);

              // Notify backend that category is complete
              fetch("http://127.0.0.1:5000/complete-category", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ category: selectedCategory })
              });
            }, 1000);
          }
        }
        return;
      }

      // Incorrect guess: lose a life and reset input after delay
      setLives((prev) => {
        const updated = Math.max(prev - 1, 0);
        if (updated === 0) setGameOver(true);
        return updated;
      });

      clearTimeout(timeoutRefs.current[index]);
      timeoutRefs.current[index] = setTimeout(() => {
        setUserInput((prevInput) => {
          const updated = [...prevInput];
          if (updated[index] !== correctLetter) updated[index] = '';
          return updated;
        });
        delete timeoutRefs.current[index];
      }, 1000);
    }
  };

  let letterIndex = 0;

  const showBogusHint = () => {
    fetch("http://127.0.0.1:5000/get-bogus-hint")
      .then((res) => res.json())
      .then((data) => {
        setHintText(data.text || "No hint available");
        setShowHint(true);
        setTimeout(() => setShowHint(false), 3000);
      })
      .catch((err) => {
        setHintText("No hint available");
        setShowHint(true);
        setTimeout(() => setShowHint(false), 3000);
      });
  };

  return (
    <div className="game-wrapper">
      <div className="game-area">
        <div className="game-header">
          <h2 className="category">{selectedCategory}</h2>
          <p>Sentence {currentSentenceIndex + 1} of {sentences.length}</p>
          <p className="hint">{sentenceData?.hint}</p>
        </div>

        {/* Render input boxes for each letter in the sentence */}
        <div className="input-container">
          {words.map((word, wordIndex) => (
            <React.Fragment key={wordIndex}>
              <div className="word-group">
                {word.split('').map((char, i) => {
                  const isLetter = /[a-zA-Z]/.test(char);
                  let currentLetterIndex = null;

                  if (isLetter) {
                    currentLetterIndex = letterIndex;
                    letterIndex++;
                  }

                  return isLetter ? (
                    <div key={`${wordIndex}-${i}`} className="input-box">
                      <input
                        ref={el => (inputRefs.current[currentLetterIndex] = el)}
                        type="text"
                        disabled={gameOver}
                        className={
                          userInput[currentLetterIndex] &&
                          userInput[currentLetterIndex].toLowerCase() === correctLetters[currentLetterIndex]?.toLowerCase()
                            ? "correct-input"
                            : userInput[currentLetterIndex] &&
                              userInput[currentLetterIndex].toLowerCase() !== correctLetters[currentLetterIndex]?.toLowerCase()
                            ? "incorrect"
                            : ""
                        }
                        readOnly={
                          userInput[currentLetterIndex] &&
                          userInput[currentLetterIndex].toLowerCase() === correctLetters[currentLetterIndex]?.toLowerCase()
                        }
                        maxLength="1"
                        value={userInput[currentLetterIndex]}
                        onChange={e => handleChange(currentLetterIndex, e.target.value)}
                      />
                      {/* Show the number label under each letter */}
                      <span className="number-label">{letterMapping[char.toLowerCase()] || ''}</span>
                    </div>
                  ) : null;
                })}
              </div>
              {/* Add space between words */}
              {wordIndex < words.length - 1 && <div className="space-box">&nbsp;&nbsp;&nbsp;</div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Life bar showing remaining lives */}
      <div className="life-bar centered">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`heart ${i < lives ? 'full' : 'empty'}`}>
            &#10084;
          </span>
        ))}
      </div>

      {/* Hint character image and text */}
      <div className="hint-character" onClick={showBogusHint} style={{ cursor: "pointer" }}>
        <img src={hintCharacter} alt="Hint Character" className="hint-image" />
        <div className="hint-text">Ask me</div>
        {showHint && <div className="speech-bubble">{hintText}</div>}
      </div>

      {/* Popup message shown when category is completed */}
      {showPopup && (
        <div
          className="popup-message"
          style={{
            backgroundImage: `url(${parchmentImage})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            color: 'black',
            border: '2px solid #222',
            maxWidth: '500px',
            padding: '40px',
          }}
        >
          <div className="popup-content">
            <p>{popupMessage}</p>
            <button onClick={() => setShowPopup(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPuzzle;
