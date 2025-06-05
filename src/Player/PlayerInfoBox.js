// This script displays and allows editing of the player's profile info ("About Me" box) on the player page.
// Used in PlayerPage.js

import React, { useState, useEffect, useRef } from 'react';
import './PlayerInfoBox.css';

const PlayerInfoBox = (props) => {
  // State for player data fetched from backend
  const [playerData, setPlayerData] = useState(null);
  // State to toggle edit mode for the "About Me" section
  const [isEditing, setIsEditing] = useState(false);
  // Temporary state for editing the "About Me" text
  const [tempAbout, setTempAbout] = useState("");
  // Ref for the hidden file input (profile picture upload)
  const fileInputRef = useRef(null);

  // Fetch player profile data when component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:5000/loggedin-player-profile", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPlayerData(data);
          setTempAbout(data.about || "");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, []);

  // Save the edited "About Me" text to the backend
  const handleSave = async () => {
    try {
      const res = await fetch("http://localhost:5000/updating-player-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ about: tempAbout }),
      });

      const data = await res.json();
      if (data.success) {
        // Update local state with new about text
        setPlayerData({ ...playerData, about: tempAbout });
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to save about:", err);
    }
  };

  // Trigger the hidden file input when profile picture area is clicked
  const handleUploadClick = () => fileInputRef.current.click();

  // Handle profile picture file selection and upload to backend
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("picture", file);

    try {
      const res = await fetch("http://localhost:5000/upload-profilepic", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPlayerData({ ...playerData, picture: data.picture });
      }
    } catch (err) {
      console.error("Failed to upload picture:", err);
    }
  };

  // Show loading state while fetching player data
  if (!playerData) return <div className="noir-box">Loading...</div>;

  return (
    <div className="noir-box player-info-box">
      <h2>Detective Profile</h2>

      {/* Profile picture and basic info */}
      <div className="profile-section">
        <div className="profile-pic-wrapper" onClick={handleUploadClick}>
          {playerData.picture ? (
            // Show profile picture if available
            <img src={`http://localhost:5000${playerData.picture}`} alt="Profile" />
          ) : (
            // Otherwise, show upload placeholder
            <span className="upload-placeholder">Upload</span>
          )}
          {/* Hidden file input for uploading new profile picture */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*"
          />
        </div>
        <div className="player-details">
          <p><strong>Username:</strong> {playerData.username}</p>
          <p><strong>Joined:</strong> {playerData.joined || "Unknown"}</p>
        </div>
      </div>

      {/* About Me section */}
      <div className="about-me-section">
        <label><strong>About Me:</strong></label>
        {isEditing ? (
          // Edit mode: show textarea and save button
          <>
            <textarea
              value={tempAbout}
              onChange={(e) => setTempAbout(e.target.value)}
              maxLength={240}
              className="about-textarea"
            />
            <div className="char-counter">{tempAbout.length} / 240</div>
            <button className="edit-save-btn" onClick={handleSave}>Save</button>
          </>
        ) : (
          // View mode: show about text and edit button
          <>
            <div className="about-static-box">{playerData.about || "No description yet."}</div>
            <button className="edit-save-btn" onClick={() => setIsEditing(true)}>Edit</button>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerInfoBox;
