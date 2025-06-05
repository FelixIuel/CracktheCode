// FriendsBox.js
// This component handles player friend management: searching players, sending/accepting/declining friend requests, removing friends, and launching chats.
// Used in PlayerPage.js


// imports
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './FriendsBox.css';

// Main FriendsBox component
const FriendsBox = ({ onChat }) => {
  const [friends, setFriends] = useState([]); // List of current friends
  const [requests, setRequests] = useState([]); // Incoming friend requests
  const [searchQuery, setSearchQuery] = useState(''); // Search input value
  const [statusMessage, setStatusMessage] = useState(''); // Status/info messages
  const [searchResults, setSearchResults] = useState([]); // Results from player search
  const [isSending, setIsSending] = useState(false); // Loading state for sending/searching
  const [showSearchResults, setShowSearchResults] = useState(false); // Toggle search results display

  // Fetch friends and requests on mount
  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  // Fetch current friends from backend
  const fetchFriends = () => {
    fetch('http://localhost:5000/get-friends', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) setFriends(data.friends);
    });
  };

  // Fetch incoming friend requests from backend
  const fetchRequests = () => {
    fetch('http://localhost:5000/friend-requests', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) setRequests(data.friend_requests);
    });
  };

  // Handle searching for players
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setStatusMessage('Searching...');
    setShowSearchResults(true);

    fetch(`http://localhost:5000/search-players/${searchQuery}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.users.length > 0) {
        setSearchResults(data.users);
        setStatusMessage(`${data.users.length} player(s) found.`);
      } else {
        setSearchResults([]);
        setStatusMessage(`Oops, couldn't find anyone by that name.`);
      }
    });
  };

  // Send a friend request to a player
  const handleSendRequest = (username) => {
    setIsSending(true);
    fetch('http://localhost:5000/send-friend-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ username })
    })
    .then(res => res.json())
    .then(data => {
      setIsSending(false);
      if (data.success) {
        setStatusMessage(`Friend request sent to ${username}`);
        fetchRequests(); // Refresh requests list
      } else {
        setStatusMessage(`Failed to send request to ${username}`);
      }
    });
  };

  // Accept a friend request
  const handleAccept = (username) => {
    fetch('http://localhost:5000/accept-friend-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ username })
    })
    .then(res => res.json())
    .then(data => {
      setStatusMessage(data.message || 'Friend request accepted');
      fetchFriends();
      fetchRequests();
    });
  };

  // Decline a friend request
  const handleDecline = (username) => {
    fetch('http://localhost:5000/deny-friend-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ username })
    })
    .then(res => res.json())
    .then(data => {
      setStatusMessage(data.message || 'Friend request denied');
      fetchRequests();
    });
  };

  // Remove a friend from friend list
  const handleRemoveFriend = (username) => {
    fetch('http://localhost:5000/remove-friend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ username })
    })
    .then(res => res.json())
    .then(data => {
      setStatusMessage(data.message || 'Friend removed');
      fetchFriends();
    });
  };

  // Render component
  return (
    <div className="noir-box friends-box">
      {/* Header */}
      <div className="section-header">
        <h2>Connections</h2>
      </div>

      {/* Search Bar Section */}
      <div className="section">
        <div className="section-title">
          <input
            type="text"
            placeholder="Search for players"
            className="friend-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={isSending} className="send-button">
            {isSending ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Status message for search */}
        <div className="status-message">{statusMessage}</div>

        {/* Search Results List */}
        {showSearchResults && (
          <div className="search-results">
            {/* Close search results */}
            <div
              className="close-search-button"
              onClick={() => setShowSearchResults(false)}
            >
              ✖
            </div>
            {/* List of found players */}
            {searchResults.map((player) => (
              <div key={player.username} className="player-item">
                <Link to={`/player/${player.username}`} style={{ marginRight: '10px' }}>
                  {player.username}
                </Link>
                <button
                  onClick={() => handleSendRequest(player.username)}
                  disabled={isSending}
                  className="send-request-button"
                >
                  {isSending ? 'Sending...' : 'Send Friend Request'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friend List Section */}
      <div className="section">
        <h3>Friends</h3>
        {friends.length ? (
          friends.map((f) => (
            <div key={f.username} className="friend-item">
              <div className="friend-info">
                <Link to={`/player/${f.username}`} style={{ textDecoration: 'none', color: 'black' }}>
                  <div className="friend-profilepic-container">
                    {f.picture ? (
                      <img
                        src={`http://localhost:5000${f.picture}`}
                        alt="profile"
                        className="friend-profilepic"
                      />
                    ) : (
                      <div className="friend-profilepic placeholder">?</div>
                    )}
                  </div>
                  <span>{f.username}</span>
                </Link>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Launch chat with friend */}
                <button className="chat-btn" onClick={() => onChat(f.username, 'friend')}>Chat</button>
                {/* Remove friend */}
                <button className="remove-btn" onClick={() => handleRemoveFriend(f.username)}>Remove</button>
              </div>
            </div>
          ))
        ) : (
          <p className="dim">No friends yet</p>
        )}
      </div>

      {/* Friend Requests Section */}
      <div className="section">
        <h3>Requests</h3>
        {requests.length ? (
          requests.map((r) => (
            <div key={r.username} className="request-item">
              {r.username}
              <div className="request-buttons">
                {/* Accept friend request */}
                <button onClick={() => handleAccept(r.username)}>✔</button>
                {/* Decline friend request */}
                <button onClick={() => handleDecline(r.username)}>✖</button>
              </div>
            </div>
          ))
        ) : (
          <p className="dim">No requests</p>
        )}
      </div>
    </div>
  );
};

export default FriendsBox;
