// This script is responsible for displaying the stamps the player has collected in the game.
// This comes in when the player clicks the profile or searches for a player.

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './PlayerPage.css';
import backgroundImg from '../assets/pictures/userpage/user-background.png';

// This is the public player page component
const PublicPlayerPage = () => {
  const { username } = useParams(); // Get username from URL params
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(null);
  const token = localStorage.getItem('token'); // Get token from local storage

  // Fetch player data when username changes
  useEffect(() => {
    fetch(`http://localhost:5000/public-profile/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlayerData(data.user); // Set player data if fetch is successful
        }
      });
  }, [username, token]);

  // Show loading message if player data isn't loaded yet
  if (!playerData) {
    return (
      <div className="player-page-wrapper">
        <div className="profile-container">
          <p style={{ padding: "20px" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Main render of the public player page
  return (
    <div
      className="player-page-wrapper"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        fontFamily: '"Courier New", Courier, monospace',
        paddingTop: '60px'
      }}
    >
      <div className="profile-container">
        <div className="parchment-box two-column-layout">
          <div className="left-column">
            <div className="noir-box player-info-box">
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '8px' }}>
                {/* Button to return to own profile */}
                <button
                  onClick={() => navigate('/profile')}
                  className="send-button"
                >
                  Return to own profile
                </button>
              </div>

              <h2>Detective Profile</h2>

              <div className="profile-section">
                <div className="profile-pic-wrapper">
                  {/* Show profile picture if exists, otherwise show placeholder */}
                  {playerData.picture ? (
                    <img src={`http://localhost:5000${playerData.picture}`} alt="Profile" />
                  ) : (
                    <span className="upload-placeholder">?</span>
                  )}
                </div>
                <div className="player-details">
                  <p><strong>Username:</strong> {playerData.username}</p>
                  <p><strong>Joined:</strong> {playerData.joined}</p>
                </div>
              </div>

              <div className="about-me-section">
                <label><strong>About Me:</strong></label>
                {/* Show about me or fallback text */}
                <div className="about-static-box">{playerData.about || "No description yet."}</div>
              </div>
            </div>

            <div className="noir-box">
              <div className="section-header">
                <h3>Friends</h3>
              </div>
              <div className="section">
                {/* List friends if any, otherwise show message */}
                {playerData.friends?.length > 0 ? (
                  playerData.friends.map((friend) => (
                    <div key={friend.username} className="friend-item">
                      <div className="friend-info">
                        <div className="friend-profilepic-container">
                          {friend.picture ? (
                            <img
                              src={`http://localhost:5000${friend.picture}`}
                              alt="profile"
                              className="friend-profilepic"
                            />
                          ) : (
                            <div className="friend-profilepic placeholder">?</div>
                          )}
                        </div>
                        <span>{friend.username}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="dim"><em>No friends listed</em></p>
                )}
              </div>
            </div>
          </div>

          <div className="right-column">
            <div className="noir-box">
              <div className="section-header">
                <h3>Daily Streak</h3>
              </div>
              <div className="section">
                {/* Show current and longest streak */}
                <p><strong>Current:</strong> {playerData.streak?.current || 0} days</p>
                <p><strong>Longest:</strong> {playerData.streak?.longest || 0} days</p>
              </div>
            </div>

            <div className="noir-box">
              <div className="section-header">
                <h3>Category Stamps</h3>
              </div>
              <div className="section stamps-section">
                {/* List stamps if any, otherwise show message */}
                {playerData.stamps?.length > 0 ? (
                  playerData.stamps.map((stamp, i) => (
                    <div key={i} className="stamp-box">{stamp}</div>
                  ))
                ) : (
                  <p className="dim"><em>No stamps yet</em></p>
                )}
              </div>
            </div>

            <div className="noir-box">
              <div className="section-header">
                <h3>Groups</h3>
              </div>
              <div className="section">
                {/* List groups if any, otherwise show message */}
                {playerData.groups?.length > 0 ? (
                  playerData.groups.map((group, i) => (
                    <p key={i}>{group}</p>
                  ))
                ) : (
                  <p className="dim"><em>Not in any groups</em></p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPlayerPage;