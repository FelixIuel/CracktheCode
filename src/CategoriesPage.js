// This script renders the main categories selection page for the game
// and allows players to select a category to play puzzles from
// Miscellaneous other functions are also included such as music toggle

// imports
import React, { useRef, useState, useEffect } from "react";
import CategoriesPuzzle from "./CategoriesPuzzle";
// Assets
import backgroundImg from "./assets/pictures/gamepage/GamePage-Background.png";
import speakerOnIcon from "./assets/pictures/gamepage/speaker-on.png";
import speakerOffIcon from "./assets/pictures/gamepage/speaker-off.png";
import gameTheme from "./assets/sounds/gamepage/game-theme.mp3";

import stampDota from "./assets/pictures/stamps/STAMP - DOTA.png";
import stampEarth from "./assets/pictures/stamps/STAMP - EARTH.png";
import stampLorum from "./assets/pictures/stamps/STAMP - LORUM IPSUM.png";
import stampMedsoe from "./assets/pictures/stamps/STAMP - MEDSOE.png";
import stampScience from "./assets/pictures/stamps/STAMP - SCIENCE.png";

import "./CategoriesPage.css";

// List of available categories with their stamp images
const categories = [
  { name: "DOTA", image: stampDota },
  { name: "EARTH", image: stampEarth },
  { name: "LORUM IPSUM", image: stampLorum },
  { name: "MEDSOE", image: stampMedsoe },
  { name: "SCIENCE", image: stampScience },
];

function CategoriesPage({ onLoginClick, onSignupClick, isLoggedIn }) {
  // Ref for the audio element
  const audioRef = useRef(null);

  // State for music playback
  const [isPlaying, setIsPlaying] = useState(false);

  // State for currently selected category
  const [selectedCategory, setSelectedCategory] = useState("DOTA");

  // State for categories the player has cleared (stamped)
  const [clearedCategories, setClearedCategories] = useState([]);

  // Fetch cleared categories (stamps) from backend on mount
  useEffect(() => {
    const fetchStamps = async () => {
      try {
        const res = await fetch("http://localhost:5000/loggedin-player-profile", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.user.stamps)) {
          setClearedCategories(data.user.stamps);
        }
        if (Array.isArray(data.stamps)) {
          setClearedCategories(data.stamps);
        }
      } catch (err) {
        console.error("Failed to fetch player stamps:", err);
      }
    };

    fetchStamps();
  }, []);

  // Toggle background music on/off
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

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        paddingTop: "80px",
        paddingBottom: "40px",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      {/* Music toggle button (bottom right corner) */}
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

      {/* Background music audio element */}
      <audio ref={audioRef} loop>
        <source src={gameTheme} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* Categories selection area */}
      <div className="categories-wrapper">
        <h2 className="categories-title">Categories</h2>
        <div className="categories-stamps">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className={`category-stamp ${
                selectedCategory === cat.name ? "selected" : ""
              } ${clearedCategories.includes(cat.name) ? "cleared" : ""}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              <img src={cat.image} alt={cat.name} />
              <div className="category-name">{cat.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Puzzle for the selected category */}
      <div className="container">
        <CategoriesPuzzle selectedCategory={selectedCategory} />
      </div>
    </div>
  );
}

export default CategoriesPage;
