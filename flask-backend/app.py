## This is the main Flask backend for the CrackTheCode game.
## It handles user authentication, profile management, game scores, daily puzzles, endless puzzles, and a friend system.
## To run it, first ensure you have Flask, Flask-PyMongo, Flask-Bcrypt, Flask-JWT-Extended, and other dependencies installed.
## Then run this script with Python this is how:
## if you dont have the dependencies installed, run the following commands: pip install -r requirements.txt
## then run the following commands:
## cd flask-backend
## venv\Scripts\activate
## Python app.py

# Flask Backend for CrackTheCode Game
from flask import Flask, jsonify, request, send_from_directory
from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
) 
from flask_cors import CORS
from datetime import datetime, timedelta
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from apscheduler.schedulers.background import BackgroundScheduler
import os
import random
import requests
import re

# Load environment variables from .env file (for secrets, configs, etc.)
load_dotenv()

# Set up the Flask app and enable CORS for frontend communication
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000", "methods": ["GET", "POST", "OPTIONS"]}})

# MongoDB and JWT configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/crackthecode")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "default_dev_secret")

mongo = PyMongo(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Serve uploaded profile pictures from the uploads folder
@app.route('/static/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory('static/uploads', filename)

# Simple health check route to see if backend is running
@app.route('/')
def home():
    return "Flask backend is running!"

## User Authentication - lets users sign up, log in, and manage their profiles with JWT tokens

# Register a new user
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required"}), 400
    if mongo.db.users.find_one({"username": username}):
        return jsonify({"success": False, "error": "User already exists"}), 409
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    mongo.db.users.insert_one({
        "username": username,
        "password": hashed_password,
        "about": "This is your start text",
        "picture": "",
        "streak": {"current": 0, "longest": 0},
        "stamps": [],
        "joined": datetime.utcnow().strftime("%d.%m.%Y")
    })
    return jsonify({"success": True, "message": "User created"}), 201

# Log in and get a JWT token
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    user = mongo.db.users.find_one({"username": username})
    if not user or not bcrypt.check_password_hash(user['password'], password):
        return jsonify({"success": False, "error": "Invalid credentials"}), 401
    token = create_access_token(identity=username)
    return jsonify({"success": True, "access_token": token}), 200

## User Profile - Here are all the parts that lets players to be able to personalize their profiles.

# Get the current user's username (for quick checks)
@app.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    current_user = get_jwt_identity()
    return jsonify({"success": True, "user": current_user}), 200

# Get the full profile of the logged-in user (excluding sensitive info)
@app.route('/user-profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"username": current_user}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404
    return jsonify({"success": True, "user": user}), 200

# Update the "about" section of the user's profile
@app.route('/update-profile', methods=['POST'])
@jwt_required()
def update_profile():
    current_user = get_jwt_identity()
    about = request.json.get("about")
    if about is None:
        return jsonify({"success": False, "error": "Missing 'about' field"}), 400
    mongo.db.users.update_one({"username": current_user}, {"$set": {"about": about}})
    return jsonify({"success": True}), 200

# Upload or replace the user's profile picture
@app.route('/upload-picture', methods=['POST'])
@jwt_required()
def upload_picture():
    current_user = get_jwt_identity()
    picture_file = request.files.get("picture")
    if not picture_file:
        return jsonify({"success": False, "error": "No picture uploaded"}), 400

    user = mongo.db.users.find_one({"username": current_user})
    # Remove old picture if it exists. to reduce storage usage, since my server is not infinite in space
    if user and user.get("picture"):
        old_filename = user["picture"].replace("/static/uploads/", "")
        old_path = os.path.join("static", "uploads", old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    upload_dir = os.path.join("static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = secure_filename(f"{current_user}_{picture_file.filename}")
    filepath = os.path.join(upload_dir, filename)
    picture_file.save(filepath)

    image_url = f"/static/uploads/{filename}"
    mongo.db.users.update_one({"username": current_user}, {"$set": {"picture": image_url}})
    return jsonify({"success": True, "picture": image_url}), 200

## Score Handling

# Submit a new game score for the current user
@app.route('/submit-score', methods=['POST'])
@jwt_required()
def submit_score():
    current_user = get_jwt_identity()
    data = request.json
    score = data.get("score")
    session_id = data.get("sessionId")
    if not score or not session_id:
        return jsonify({"success": False, "error": "Missing score or sessionId"}), 400
    if mongo.db.scores.find_one({"username": current_user, "sessionId": session_id}):
        return jsonify({"success": False, "error": "Score already submitted"}), 409
    mongo.db.scores.insert_one({
        "username": current_user,
        "score": score,
        "sessionId": session_id,
        "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
    })
    return jsonify({"success": True, "message": "Score submitted"}), 200

# Get the top 250 high scores (best score per user)
@app.route('/get-highscores', methods=['GET'])
def get_highscores():
    scores = list(mongo.db.scores.aggregate([
        {"$group": {
            "_id": "$username",
            "best_score": {"$max": "$score"},
            "timestamp": {"$first": "$timestamp"}
        }},
        {"$sort": {"best_score": -1}},
        {"$limit": 250}
    ]))
    return jsonify({"success": True, "highscores": [
        {"username": s["_id"], "score": s["best_score"], "timestamp": s["timestamp"]} for s in scores
    ]})

# Get all scores for the current user, sorted by score
@app.route('/my-scores', methods=['GET'])
@jwt_required()
def get_my_scores():
    current_user = get_jwt_identity()
    scores = list(mongo.db.scores.find({"username": current_user}).sort("score", -1))
    return jsonify({"success": True, "scores": [
        {"score": s["score"], "timestamp": s.get("timestamp", "")} for s in scores
    ]})

## Daily Puzzle System

# Get today's daily puzzle (generates one if not already created)
@app.route('/daily-puzzle', methods=['GET'])
@jwt_required()
def get_daily_puzzle():
    current_user = get_jwt_identity()
    today = datetime.utcnow().strftime('%Y-%m-%d')

    # Check if user already played today
    existing_attempt = mongo.db.daily_attempts.find_one({"username": current_user, "date": today})
    if existing_attempt:
        return jsonify({"error": "Already played today"}), 403

    # Generate a new daily puzzle if there isn't one for today
    existing_puzzle = mongo.db.daily_sentence.find_one({"date": today})
    if not existing_puzzle:
        try:
            response = requests.get("https://zenquotes.io/api/random")
            quote_data = response.json()[0]
            raw_sentence = quote_data.get("q", "")
            clean_sentence = re.sub(r"[^a-zA-Z ]", "", raw_sentence)

            unique_letters = sorted(set(clean_sentence.replace(" ", "").lower()))
            letter_map = {char: str(i + 1) for i, char in enumerate(unique_letters)}
            revealed_letters = random.sample(unique_letters, min(2, len(unique_letters)))

            doc = {
                "date": today,
                "sentence": clean_sentence,
                "hint": f"By {quote_data.get('a', 'Unknown')}",
                "revealedLetters": revealed_letters,
                "letterMap": letter_map
            }
            mongo.db.daily_sentence.insert_one(doc)
        except Exception as e:
            return jsonify({"error": "Failed to generate daily puzzle", "details": str(e)}), 500
    else:
        doc = existing_puzzle

    return jsonify(doc)

# Mark the daily puzzle as completed for the user and update streaks
@app.route('/complete-daily-puzzle', methods=['POST'])
@jwt_required()
def complete_daily_puzzle():
    current_user = get_jwt_identity()
    today = datetime.utcnow().strftime('%Y-%m-%d')

    if mongo.db.daily_attempts.find_one({"username": current_user, "date": today}):
        return jsonify({"success": False, "message": "Already completed"}), 400

    mongo.db.daily_attempts.insert_one({"username": current_user, "date": today})

    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    played_yesterday = mongo.db.daily_attempts.find_one({
        "username": current_user,
        "date": yesterday
    })

    user = mongo.db.users.find_one({"username": current_user})
    current = user.get("streak", {}).get("current", 0)
    longest = user.get("streak", {}).get("longest", 0)

    if played_yesterday:
        current += 1
    else:
        current = 1

    if current > longest:
        longest = current

    mongo.db.users.update_one({"username": current_user}, {
        "$set": {
            "streak.current": current,
            "streak.longest": longest
        }
    })

    return jsonify({"success": True, "current": current, "longest": longest}), 200

## Endless Game Puzzles

# Get a random puzzle from the endless pool
@app.route('/get-puzzle', methods=['GET'])
def get_puzzle():
    sentences = list(mongo.db.sentences.find())
    if not sentences:
        return jsonify({"error": "No puzzles found"}), 404
    puzzle = random.choice(sentences)
    return jsonify({
        "category": puzzle.get("category", "General"),
        "hint": puzzle.get("hint", ""),
        "sentence": puzzle.get("sentence", ""),
        "revealedLetters": puzzle.get("revealedLetters", []),
        "letterMap": puzzle.get("letterMap", {})
    })

## Category Puzzles

# Get all puzzles for a specific category
@app.route('/get-category/<category>', methods=['GET'])
def get_category_puzzles(category):
    try:
        collection_map = {
            "DOTA": "Dota",
            "EARTH": "Earth",
            "LORUM IPSUM": "LORUM_IPSUM",
            "MEDSOE": "Medsoe",
            "SCIENCE": "Science"
        }
        if category not in collection_map:
            return jsonify({"error": f"Unknown category '{category}'"}), 404
        collection_name = collection_map[category]
        docs = list(mongo.db[collection_name].find({}, {'_id': 0}))
        return jsonify(docs), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch category puzzles", "details": str(e)}), 500

## Friend System - the friend system allows users to send friend requests, accept them, and manage their friends list so the site is more social and less lonely

# Search for users by username (excluding yourself)
@app.route('/search-users/<query>', methods=['GET'])
@jwt_required()
def search_users(query):
    current_user = get_jwt_identity()
    users = mongo.db.users.find({
        "username": {"$regex": query, "$options": "i"},
        "username": {"$ne": current_user}
    }, {"_id": 0, "username": 1, "picture": 1})
    return jsonify({"success": True, "users": list(users)}), 200

# Send a friend request to another user
@app.route('/send-friend-request', methods=['POST'])
@jwt_required()
def send_friend_request():
    current_user = get_jwt_identity()
    data = request.get_json()
    target_username = data.get("username")

    if target_username == current_user:
        return jsonify({"success": False, "message": "You can't add yourself"}), 400

    sender = mongo.db.users.find_one({"username": current_user})
    receiver = mongo.db.users.find_one({"username": target_username})

    if not receiver:
        return jsonify({"success": False, "message": "User not found"}), 404

    if target_username in sender.get("sentRequests", []):
        return jsonify({"success": False, "message": "Request already sent"}), 400

    if current_user in receiver.get("friendRequests", []):
        return jsonify({"success": False, "message": "Already requested"}), 400

    mongo.db.users.update_one({"username": current_user}, {"$addToSet": {"sentRequests": target_username}})
    mongo.db.users.update_one({"username": target_username}, {"$addToSet": {"friendRequests": current_user}})

    return jsonify({"success": True, "message": "Request sent"}), 200

# Get all incoming friend requests for the current user
@app.route('/friend-requests', methods=['GET'])
@jwt_required()
def get_friend_requests():
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"username": current_user})
    requests = user.get("friendRequests", [])
    formatted = list(mongo.db.users.find({"username": {"$in": requests}}, {"_id": 0, "username": 1, "picture": 1}))
    return jsonify({"success": True, "friend_requests": formatted}), 200

# Get the current user's friends (with basic info)
@app.route('/get-friends', methods=['GET'])
@jwt_required()
def get_friends():
    current_user = get_jwt_identity()
    user = mongo.db.users.find_one({"username": current_user})
    friends = user.get("friends", [])
    formatted = list(mongo.db.users.find({"username": {"$in": friends}}, {"_id": 0, "username": 1, "picture": 1}))
    return jsonify({"success": True, "friends": formatted}), 200

# Accept a friend request
@app.route('/accept-friend-request', methods=['POST'])
@jwt_required()
def accept_friend():
    current_user = get_jwt_identity()
    username = request.json.get("username")

    mongo.db.users.update_one({"username": current_user}, {
        "$pull": {"friendRequests": username},
        "$addToSet": {"friends": username}
    })

    mongo.db.users.update_one({"username": username}, {
        "$pull": {"sentRequests": current_user},
        "$addToSet": {"friends": current_user}
    })

    return jsonify({"success": True, "message": "Friend request accepted"}), 200

# Deny a friend request
@app.route('/deny-friend-request', methods=['POST'])
@jwt_required()
def deny_friend():
    current_user = get_jwt_identity()
    username = request.json.get("username")

    mongo.db.users.update_one({"username": current_user}, {"$pull": {"friendRequests": username}})
    mongo.db.users.update_one({"username": username}, {"$pull": {"sentRequests": current_user}})

    return jsonify({"success": True, "message": "Friend request denied"}), 200

# Remove a friend from your friends list #friendshipended
@app.route('/remove-friend', methods=['POST'])
@jwt_required()
def remove_friend():
    current_user = get_jwt_identity()
    username = request.json.get("username")

    mongo.db.users.update_one({"username": current_user}, {"$pull": {"friends": username}})
    mongo.db.users.update_one({"username": username}, {"$pull": {"friends": current_user}})

    return jsonify({"success": True, "message": f"{username} has been removed as your friend"}), 200

## Group System - the group system allows users to create and join groups, manage members, and chat within groups

# Create a new group with a password (admin is the creator)
@app.route('/create-group', methods=['POST'])
@jwt_required()
def create_group():
    current_user = get_jwt_identity()
    data = request.get_json()
    group_name = data.get("name")
    password = data.get("password")

    if not group_name or not password:
        return jsonify({"success": False, "error": "Group name and password required"}), 400

    existing = mongo.db.groups.find_one({"name": group_name})
    if existing:
        return jsonify({"success": False, "error": "Group name already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    mongo.db.groups.insert_one({
        "name": group_name,
        "password": hashed_password, # Store hashed password to ensure security
        "members": [current_user], # Start with the creator as the only member
        "admin": current_user # Admin is the creator
    })

    return jsonify({"success": True, "message": "Group created"}), 201

# Join an existing group by name and password
@app.route('/join-group', methods=['POST'])
@jwt_required()
def join_group():
    current_user = get_jwt_identity()
    data = request.get_json()
    group_name = data.get("name")
    password = data.get("password")

    group = mongo.db.groups.find_one({"name": group_name})
    if not group:
        return jsonify({"success": False, "error": "Group not found"}), 404

    if not bcrypt.check_password_hash(group["password"], password):
        return jsonify({"success": False, "error": "Incorrect password"}), 403

    if current_user in group.get("members", []):
        return jsonify({"success": False, "error": "Already a member"}), 400

    mongo.db.groups.update_one(
        {"name": group_name},
        {"$addToSet": {"members": current_user}}
    )

    return jsonify({"success": True, "message": "Joined group"}), 200

# Remove a member from a group (admin only) - think gandalf the grey and the balrog "You shall not pass!"
@app.route('/remove-member', methods=['POST'])
@jwt_required()
def remove_member():
    current_user = get_jwt_identity()
    data = request.get_json()
    group_name = data.get("group")
    target_user = data.get("username")

    group = mongo.db.groups.find_one({"name": group_name})
    if not group:
        return jsonify({"success": False, "error": "Group not found"}), 404

    if group.get("admin") != current_user:
        return jsonify({"success": False, "error": "Only admin can remove members"}), 403

    mongo.db.groups.update_one(
        {"name": group_name},
        {"$pull": {"members": target_user}}
    )

    return jsonify({"success": True, "message": "Member removed"}), 200

# Search for groups by name (case-insensitive), beacause it ensures that users can find groups easily
@app.route('/search-groups/<query>', methods=['GET'])
@jwt_required()
def search_groups(query):
    groups = mongo.db.groups.find(
        {"name": {"$regex": query, "$options": "i"}},
        {"_id": 0, "name": 1}
    )
    return jsonify({"success": True, "groups": list(groups)}), 200

# Get all groups the current user is a member of
@app.route('/my-groups', methods=['GET'])
@jwt_required()
def my_groups():
    current_user = get_jwt_identity()
    groups = list(mongo.db.groups.find(
        {"members": current_user},
        {"_id": 0, "name": 1, "admin": 1, "members": 1}
    ))
    return jsonify({"success": True, "groups": groups}), 200

# Get all members of a specific group
@app.route('/group-members/<groupname>', methods=['GET'])
@jwt_required()
def get_group_members(groupname):
    group = mongo.db.groups.find_one({"name": groupname})
    if not group:
        return jsonify({"success": False, "error": "Group not found"}), 404

    return jsonify({"success": True, "members": group.get("members", [])}), 200

## Chat System - the chat system allows users to communicate with friends and groups in profile page

# Get chat messages for a friend or group chat
@app.route('/chat/<chat_type>/<target>', methods=['GET'])
@jwt_required()
def get_chat(chat_type, target):
    current_user = get_jwt_identity()
    if chat_type not in ['friend', 'group']:
        return jsonify({"success": False, "error": "Invalid chat type"}), 400

    if chat_type == 'friend':
        key = sorted([current_user, target])
        chat = mongo.db.friend_chats.find_one({"participants": key})
        messages = chat.get('messages', []) if chat else []
    else:
        group = mongo.db.groups.find_one({"name": target})
        if not group or current_user not in group.get('members', []):
            return jsonify({"success": False, "error": "Access denied"}), 403
        chat = mongo.db.group_chats.find_one({"group": target})
        messages = chat.get('messages', []) if chat else []

    return jsonify({"success": True, "messages": messages}), 200

# Post a new message to a friend or group chat (keeps only last 20 messages)
@app.route('/chat/<chat_type>/<target>', methods=['POST'])
@jwt_required()
def post_chat(chat_type, target):
    current_user = get_jwt_identity()
    data = request.get_json()
    message = data.get('message')

    if not message:
        return jsonify({"success": False, "error": "No message"}), 400

    new_message = {
        "sender": current_user,
        "text": message
    }

    if chat_type == 'friend':
        key = sorted([current_user, target])
        chat = mongo.db.friend_chats.find_one({"participants": key})
        if chat:
            updated = chat["messages"][-19:] + [new_message] if len(chat["messages"]) >= 20 else chat["messages"] + [new_message]
            mongo.db.friend_chats.update_one(
                {"participants": key},
                {"$set": {"messages": updated}}
            )
        else:
            mongo.db.friend_chats.insert_one({"participants": key, "messages": [new_message]})
    elif chat_type == 'group':
        group = mongo.db.groups.find_one({"name": target})
        if not group or current_user not in group.get('members', []):
            return jsonify({"success": False, "error": "Access denied"}), 403

        chat = mongo.db.group_chats.find_one({"group": target})
        if chat:
            updated = chat["messages"][-19:] + [new_message] if len(chat["messages"]) >= 20 else chat["messages"] + [new_message]
            mongo.db.group_chats.update_one(
                {"group": target},
                {"$set": {"messages": updated}}
            )
        else:
            mongo.db.group_chats.insert_one({"group": target, "messages": [new_message]})
    else:
        return jsonify({"success": False, "error": "Invalid chat type"}), 400

    return jsonify({"success": True, "message": "Message sent"}), 200

## Bogus hints - some random bogus hints to use in the game, some may ask why instead why the hell not

# Get a random bogus hint from the database
@app.route('/get-bogus-hint', methods=['GET'])
def get_bogus_hint():
    hints = list(mongo.db.hints.find())
    if not hints:
        return jsonify({"text": "No hints found."}), 404
    return jsonify(random.choice(hints))

# Get a random bogus phone line message from the database
@app.route('/phoneline', methods=['GET'])
def get_random_phone_line():
    lines = list(mongo.db.phonelines.find())
    if not lines:
        return jsonify({"success": False, "message": "No phone lines found."}), 404
    return jsonify({"success": True, "message": random.choice(lines).get("message", "")})

## Public User - the getter for public profiles

# Get a public profile for any user (shows friends and groups too)
@app.route('/public-profile/<username>', methods=['GET'])
@jwt_required()
def get_public_profile(username):
    user = mongo.db.users.find_one(
        {"username": username},
        {"_id": 0, "password": 0, "sentRequests": 0, "friendRequests": 0}
    )
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    friend_usernames = user.get("friends", [])
    friends = list(mongo.db.users.find(
        {"username": {"$in": friend_usernames}},
        {"_id": 0, "username": 1, "picture": 1}
    ))

    groups = list(mongo.db.groups.find(
        {"members": username},
        {"_id": 0, "name": 1}
    ))

    user["friends"] = friends
    user["groups"] = [g["name"] for g in groups]

    return jsonify({"success": True, "user": user}), 200

## Streak Reset Scheduler - ensures users streaks are reset if they miss a daily puzzle

# Every night, reset streaks for users who missed that day's puzzle
def reset_streaks():
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    users = mongo.db.users.find()
    for user in users:
        username = user["username"]
        played = mongo.db.daily_attempts.find_one({"username": username, "date": yesterday})
        if not played:
            mongo.db.users.update_one({"username": username}, {
                "$set": {"streak.current": 0}
            })

# Schedule the streak reset to run daily at 00:05 UTC - this is 1:05 AM CET did not bother to change it
scheduler = BackgroundScheduler()
scheduler.add_job(func=reset_streaks, trigger="cron", hour=0, minute=5)
scheduler.start()

## Stamps - the categories being marked as completed for the user 

# Mark a category as completed for the user (adds a "stamp")
@app.route('/complete-category', methods=['POST'])
@jwt_required()
def complete_category():
    current_user = get_jwt_identity()
    data = request.get_json()
    category = data.get("category")

    if not category:
        return jsonify({"success": False, "error": "Missing category"}), 400

    mongo.db.users.update_one(
        {"username": current_user},
        {"$addToSet": {"stamps": category}}
    )

    return jsonify({"success": True, "message": f"Category '{category}' recorded"}), 200

## Start the Flask app - Look for print statements to confirm it's running
if __name__ == '__main__':
    print("Starting Flask app on http://127.0.0.1:5000 - so it running now")
    app.run(debug=True)