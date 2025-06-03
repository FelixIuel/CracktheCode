// This script renders the Daily Puzzle page for the game. 
// It shows a login/signup prompt if the player is not logged in, 
// and the daily puzzle game with background music controls if they are logged in.

import React, { useRef, useState } from "react";
import DailyLetterPuzzle from "./DailyLetterPuzzle";

import backgroundImg from "./assets/pictures/gamepage/GamePage-Background.png";
import speakerOnIcon from "./assets/pictures/gamepage/speaker-on.png";
import speakerOffIcon from "./assets/pictures/gamepage/speaker-off.png";
import frameBottom from "./assets/pictures/general/frame-bottom.png";
import gameTheme from "./assets/sounds/gamepage/game-theme.mp3";
import detectiveImage from "./assets/pictures/general/Daily-sentence-Picture.png";

function DailyPuzzlePage({ onLoginClick, onSignupClick, isLoggedIn }) {
  // Reference to the audio element for controlling playback
  const audioRef = useRef(null);
  // State to track if the music is playing
  const [isPlaying, setIsPlaying] = useState(false);

  // Handles toggling the background music
  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }

    setIsPlaying(!isPlaying);
  };

  // If the player is not logged in, show a prompt to log in or sign up
  if (!isLoggedIn) {
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "white",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <img
          src={detectiveImage}
          alt="Detective Login Required"
          style={{
            width: "280px",
            maxWidth: "90%",
            marginBottom: "30px",
          }}
        />
        <p
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            maxWidth: "600px",
            lineHeight: "1.5",
          }}
        >
          To play the Daily Sentence, you need to{" "}
          <span
            onClick={onLoginClick}
            style={{
              color: "#00BFFF",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            log in
          </span>{" "}
          or{" "}
          <span
            onClick={onSignupClick}
            style={{
              color: "#32CD32",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            sign up
          </span>
          .
        </p>
      </div>
    );
  }

  // If the player is logged in, show the game page with music controls and the puzzle
  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        paddingTop: "80px",
        paddingBottom: "100px",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        height: "100vh",
      }}
    >
      {/* Music toggle button in the bottom right corner */}
      <div
        onClick={toggleMusic}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: "14px",
            fontWeight: "bold",
            textShadow: "1px 1px 3px black",
            marginBottom: "5px",
          }}
        >
          Turn music {isPlaying ? "off" : "on"}
        </div>
        <img
          src={isPlaying ? speakerOnIcon : speakerOffIcon}
          alt="Toggle Music"
          style={{ width: "32px", height: "32px" }}
        />
      </div>

      {/* Audio element for background music */}
      <audio ref={audioRef} loop>
        <source src={gameTheme} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* Main puzzle container */}
      <div className="container">
        <DailyLetterPuzzle
          onLoginClick={onLoginClick}
          onSignupClick={onSignupClick}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </div>
  );
}

export default DailyPuzzlePage;