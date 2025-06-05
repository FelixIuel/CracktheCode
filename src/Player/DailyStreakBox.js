// This script is for showing the player's daily streak (current + longest)
// Data is pulled from localStorage first, then refreshed from the backend

import React, { useEffect, useState } from "react";
import "./DailyStreakBox.css";

const DailyStreakBox = () => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    // Pulls cached streak data from localStorage if available, to avoid unnecessary API calls if it hasn't changed
    const cached = localStorage.getItem("playerStreak");
    if (cached) {
      const parsed = JSON.parse(cached);
      setCurrentStreak(parsed.current || 0);
      setLongestStreak(parsed.longest || 0);
    }

    // Fetch fresh data from backend — overrides cache if newer
    const fetchStreak = async () => {
      try {
        const res = await fetch("http://localhost:5000/loggedin-player-profile", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await res.json();
        if (data.success && data.streak) {
          setCurrentStreak(data.streak.current || 0);
          setLongestStreak(data.streak.longest || 0);
          localStorage.setItem("playerStreak", JSON.stringify(data.streak));
        }
      } catch (err) {
        console.error("Failed to fetch streak info:", err);
      }
    };

    fetchStreak();
  }, []);

  return (
    <div className="noir-box streak-box">
      <h2>Daily Streak</h2>
      <div className="streak-metrics">
        <div className="streak-item">
          <span className="label">Current:</span>
          <span className="value">
            {currentStreak} day{currentStreak !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="streak-item">
          <span className="label">Longest:</span>
          <span className="value">
            {longestStreak} day{longestStreak !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DailyStreakBox;

// If time todo: add visual indicators like a clock or calendar icon
// to make it more engaging