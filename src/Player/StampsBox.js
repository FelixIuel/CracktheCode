// This script is responsible for displaying the stamps the player has collected in the game.
// It is used in PlayerPage.js

// imports
import React, { useEffect, useState } from "react";
import "./StampsBox.css";

// Importing stamp images!
import stampDota from '../assets/pictures/stamps/STAMP - DOTA.png';
import stampEarth from '../assets/pictures/stamps/STAMP - EARTH.png';
import stampLorum from '../assets/pictures/stamps/STAMP - LORUM IPSUM.png';
import stampMedsoe from '../assets/pictures/stamps/STAMP - MEDSOE.png';
import stampScience from '../assets/pictures/stamps/STAMP - SCIENCE.png';

// All possible stamp categories.
const allCategories = [
  { name: "DOTA", image: stampDota },
  { name: "EARTH", image: stampEarth },
  { name: "LORUM IPSUM", image: stampLorum },
  { name: "MEDSOE", image: stampMedsoe },
  { name: "SCIENCE", image: stampScience },
];

const StampsBox = () => {
  // Holds the categories the player has cleared
  const [clearedCategories, setClearedCategories] = useState([]);

  useEffect(() => {
    // Fetch the player's collected stamps from the backend
    const fetchStamps = async () => {
      try {
        const res = await fetch("http://localhost:5000/user-profile", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        // If the fetch is successful, and we can go home early
        if (data.success && Array.isArray(data.user.stamps)) {
          setClearedCategories(data.user.stamps);
        }
      } catch (err) {
        console.error("Failed to fetch player stamps:", err);
      }
    };

    fetchStamps();
  }, []);

  return (
    <div className="noir-box stamps-box">
      <h2>Category Stamps</h2>
      <div className="stamps-grid">
        {allCategories.map((cat) => (
          <div key={cat.name} className="stamp-wrapper">
            <img
              src={cat.image}
              alt={cat.name}
              // If the player has cleared the category, show the stamp as active. Otherwise, it's just grey.
              className={`stamp-image ${clearedCategories.includes(cat.name) ? "active" : "inactive"}`}
            />
            <div className="stamp-label">{cat.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StampsBox;
