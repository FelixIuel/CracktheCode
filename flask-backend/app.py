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

# This ensure loading the .env file, which is in gitignore.
load_dotenv()

# This is for seting up communication to frontend.
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000", "methods": ["GET", "POST", "OPTIONS"]}})

# MongoDB and JWT configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
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

## Player Authentication - Here is all that is used for signup and login. 

# Register a new Player
@app.route('/signup', methods=['POST'])
def signup():
    SignupData = request.json # takes the data from the request
    username = SignupData.get("username")
    password = SignupData.get("password")

    # check that both username and password are provided, so it does not send empty
    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required"}), 400
    
    # check if the username already exists, this ensures no duplicate usernames
    if mongo.db.players.find_one({"username": username}):
        return jsonify({"success": False, "error": "Sorry this username is taken, pick another"}), 409
    

    #bcrypt of the password, for safety 
    hashingThatPassword = bcrypt.generate_password_hash(password).decode('utf-8')

    # all thing that a new user have in the database 
    # !important remember to add new things here is implemented to the profile.
    players_data = {
        "username": username,
        "password": hashingThatPassword,
        "about": "This is your start text",
        "picture": "",
        "streak": {"current": 0, "longest": 0},
        "stamps": [],
        "joined": datetime.utcnow().strftime("%d.%m.%Y"),
        "sentRequests": [],
        "friendRequests": [],
        "friends": []
    }

    # sending it to MongoDB
    mongo.db.players.insert_one(players_data)

    # look for this message in console, to confirm it worked
    return jsonify({"success": True, "message": "Player has been created"}), 201

# Logging in and get a JWT token
@app.route('/login', methods=['POST'])
def login():
    LoginRequest = request.json
    username = LoginRequest.get("username")
    password = LoginRequest.get("password")

    # print(f"[LOGIN] has been attempted with {username}) ## Turn back, for troubleshooting

    # Checks if the player can be found in MongoDB 
    player = mongo.db.players.find_one({"username": username})
    if not player or not bcrypt.check_password_hash(player['password'], password):
        return jsonify({"error": "Invalid credentials or the Player does not exist"}), 401
    token = create_access_token(identity=username)
    return jsonify({"access_token": token}), 200

## Player Profile - All things profile related will be found here

# Get the current player username
@app.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    currentPlayer = get_jwt_identity()
    return jsonify(username=currentPlayer), 200

# Get the full profile of the logged-in Player
@app.route('/loggedin-player-profile', methods=['GET'])
@jwt_required()
def GettingThePlayerProfile():
    currentProfile = get_jwt_identity()
    PlayerProfile = mongo.db.players.find_one({"username": currentProfile}, {"_id": 0, "password": 0})
    
    #goes wrong
    if not PlayerProfile:
        return jsonify(error="This players profile was not found"), 404
    
    #goes right
    return jsonify(PlayerProfile), 200

# This for updating the profile about section 
@app.route('/updating-player-profile', methods=['POST'])
@jwt_required()
def updatingAboutProfile():
    currentPlayer = get_jwt_identity()
    aboutField = request.json.get("about")
    if not aboutField:
        return jsonify(error="About was not found"), 400
    mongo.db.players.update_one(
        {"username": currentPlayer},
        {"$set": {"about": aboutField}})
    
    return jsonify(success=True, message="It was succesfull: Profile UPDATED"), 200

# Uploading a player's profile picture
@app.route('/upload-profilepic', methods=['POST'])
@jwt_required()
def uploadingPicture():
    username = get_jwt_identity()
    picProfile = request.files.get("picture")
    if not picProfile:
        return jsonify(error="There was no picture, that was uploaded"), 400

    user = mongo.db.players.find_one({"username": username})

    # Remove old profile picture if it exists
    if user and user.get("picture"):
        oldProfilePic = user["picture"].replace("/static/uploads/", "")
        oldProfilePicPath = os.path.join("static", "uploads", oldProfilePic)
        if os.path.exists(oldProfilePicPath):
            os.remove(oldProfilePicPath)

    # Saves the new profile picture
    upload_folder = os.path.join("static", "uploads")
    os.makedirs(upload_folder, exist_ok=True)
    filename = secure_filename(f"{username}_{picProfile.filename}")
    filepath = os.path.join(upload_folder, filename)
    picProfile.save(filepath)

    newProfilePicPath = f"/static/uploads/{filename}"
    mongo.db.players.update_one({"username": username}, {"$set": {"picture": newProfilePicPath}})
    return jsonify(success=True, picture=newProfilePicPath), 200

## Score Handling

# Sending the score from endless run to the Mongo, so it can be shown in the scoreboard pag
@app.route('/submit-score', methods=['POST'])
@jwt_required()
def submitScore():
    PlayingPlayer = get_jwt_identity()
    ScoreData = request.json
    score = ScoreData.get("score")
    sessionId = ScoreData.get("sessionId")

    if not score or not sessionId:
        return jsonify(error="Something is missing, either score or session ID"), 400

    # Checking if the score has a valid number, so you can't spam send the same score
    if mongo.db.scores.find_one({"username": PlayingPlayer, "sessionId": sessionId}):
        return jsonify(error="The score has already been sendt"), 409

    mongo.db.scores.insert_one({
        "username": PlayingPlayer,
        "score": score,  
        "sessionId": sessionId, 
        "timestamp": ScoreData.get("timestamp", datetime.utcnow().isoformat())
    })

    return jsonify({"success": True, "message": "The score was saved", "score": score}), 200

# Getting all player highscores
@app.route('/get-highscores', methods=['GET'])
def getHighscores():
    HighScores = list(mongo.db.scores.aggregate([
        {"$group": {
            "_id": "$username",
            "best_score": {"$max": "$score"},
            "timestamp": {"$first": "$timestamp"}
        }},
        {"$sort": {"best_score": -1}},
        {"$limit": 250}
    ]))

    formatted = [
        {"username": entry["_id"], "score": entry["best_score"], "timestamp": entry["timestamp"]}
        for entry in HighScores
    ]

    return jsonify({"success": True, "highscores": formatted}), 200

# Get all scores for the current user, sorted by score
@app.route('/loggedin-player-scores', methods=['GET'])
@jwt_required()
def GetCurrentPlayerScores():
    PlayerThatIsLoggedIN = get_jwt_identity()
    ThatPlayerScores = list(
        mongo.db.scores.find({"username": PlayerThatIsLoggedIN}).sort("score", -1))
    formatted = [
        {"score": entry["score"], "timestamp": entry.get("timestamp", "")}
        for entry in ThatPlayerScores
    ]

    print(f"[MY SCORES] {PlayerThatIsLoggedIN} has {len(formatted)} scores")

    return jsonify(success=True, scores=formatted), 200

## Daily Puzzle Sentence
# Getter for the daily sentence and getting a new one if there is not made on for this day

@app.route('/daily-puzzle', methods=['GET'])
@jwt_required()
def getDailyPuzzle():
    player = get_jwt_identity()
    WhatDateIsITToday = datetime.utcnow().strftime('%Y-%m-%d')

    # Checking if already been played
    existing_attempt = mongo.db.daily_attempts.find_one({"username": player, "date": WhatDateIsITToday})
    if existing_attempt:
        return jsonify({"error": "This Player has already played it"}), 403

    # Generate a new daily puzzle, if they has not been created on yet #Congratsyouarethefirst
    existingSentence = mongo.db.daily_sentence.find_one({"date": WhatDateIsITToday})
    if not existingSentence:
        try: # Getting the puzzle from ZenQuotes API, and getting turn into a Code Sentence
            response = requests.get("https://zenquotes.io/api/random")
            quote_data = response.json()[0]
            sentenceUntouched = quote_data.get("q", "")
            Coded_sentence = re.sub(r"[^a-zA-Z ]", "", sentenceUntouched)

            Codedletters = sorted(set(Coded_sentence.replace(" ", "").lower()))
            letter_map = {char: str(i + 1) for i, char in enumerate(Codedletters)}
            revealed_letters = random.sample(Codedletters, min(2, len(Codedletters)))

            doc = {
                "date": WhatDateIsITToday,
                "sentence": Coded_sentence,
                "hint": f"By {quote_data.get('a', 'Unknown')}",
                "revealedLetters": revealed_letters,
                "letterMap": letter_map
            }
            mongo.db.daily_sentence.insert_one(doc)
        except Exception as e:
            return jsonify({"error": "Failed to generate daily puzzle", "details": str(e)}), 500
    else:
        doc = existingSentence

    return jsonify(doc)

# Mark the daily puzzle as completed for the user and update streaks
@app.route('/complete-daily-puzzle', methods=['POST'])
@jwt_required()
def completingDailyPuzzle():
    player = get_jwt_identity()
    TodayIs = datetime.utcnow().strftime('%Y-%m-%d')

    if mongo.db.daily_attempts.find_one({"username": player, "date": TodayIs}):
        return jsonify({"success": False, "message": "Already completed it today, come back tomorrow"}), 400

    mongo.db.daily_attempts.insert_one({"username": player, "date": TodayIs})

    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    played_yesterday = mongo.db.daily_attempts.find_one({
        "username": player,
        "date": yesterday
    })

    SpecificPlayer = mongo.db.players.find_one({"username": player})
    currentStreak = SpecificPlayer.get("streak", {}).get("current", 0)
    longestStreak = SpecificPlayer.get("streak", {}).get("longest", 0)

    # Calculate new streaks
    if played_yesterday:
        current = currentStreak + 1
    else:
        current = 1

    if current > longestStreak:
        longest = current
    else:
        longest = longestStreak

    mongo.db.players.update_one({"username": player}, {
        "$set": {
            "streak.current": current,
            "streak.longest": longest
        }
    })

    return jsonify(success=True, current=current, longest=longest), 200

## Endless Game Puzzles - first one made and baseline for all the other gamesmode

# Get a random puzzle from the endless pool
@app.route('/get-puzzle', methods=['GET'])
def GetAEndlessPuzzle():
    AllSentencesInEndless = list(mongo.db.sentences.find())

    if not AllSentencesInEndless:
        return jsonify({"error": "No puzzles found - check if server is connected"}), 404
    
    # Getting a random puzzle, so it ensure the player does not always get the same
    puzzle = random.choice(AllSentencesInEndless)
    return jsonify({
        "category": puzzle.get("category", "General"),
        "hint": puzzle.get("hint", ""),
        "sentence": puzzle.get("sentence", ""),
        "revealedLetters": puzzle.get("revealedLetters", []),
        "letterMap": puzzle.get("letterMap", {})
    }), 200

## Category Puzzles

# Get all puzzles for a specific category
@app.route('/get-category/<category>', methods=['GET'])
def getterOfCategoryPuzzles(category):
    try:
        collection_map = {
            "DOTA": "Dota",
            "EARTH": "Earth",
            "LORUM IPSUM": "LORUM_IPSUM",
            "MEDSOE": "Medsoe",
            "SCIENCE": "Science"
        }
        if category not in collection_map:
            return jsonify({"success": False, "error": "That category does not exist, how did you find it?"}), 404
        
        collection_name = collection_map[category]
        CategorySentences = list(mongo.db[collection_name].find({}, {'_id': 0}))
        return jsonify({"success": True, "sentences": CategorySentences}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
  

## Friend System - all the routes leads to new friendship aka this section handles the friend system

# Search for users by username (excluding yourself)
@app.route('/search-players/<query>', methods=['GET'])
@jwt_required()
def searchPlayers(query):
    CurrentPlayer = get_jwt_identity()
    print(f"[SEARCH] {CurrentPlayer} searched for '{query}'")
    if not query.strip():
        print("[SEARCH] Empty query, returning empty list.")
        return jsonify({"success": True, "users": []}), 200
    players = mongo.db.players.find(
        {
            "username": {
                "$regex": query,
                "$options": "i",
                "$ne": CurrentPlayer
            }
        },
        {"_id": 0, "username": 1, "picture": 1}
    )
    players_list = list(players)
    print(f"[SEARCH RESULT] Found: {players_list}")
    return jsonify({"success": True, "users": players_list}), 200

# Send a friend request to another player
@app.route('/send-friend-request', methods=['POST'])
@jwt_required()
def sendFriendRequest():
    player = get_jwt_identity()
    data = request.get_json()
    targetOfFriendShipUsername = data.get("username")

    if targetOfFriendShipUsername == player:
        return jsonify(error="You cant have yourself as a friend"), 400

    senderOfFriendship = mongo.db.players.find_one({"username": player})
    receiverOfFriendshio = mongo.db.players.find_one({"username": targetOfFriendShipUsername})

    # Player not found
    if not receiverOfFriendshio:
        return jsonify(error="Player cant be found"), 404

    # A request has already been sent
    if targetOfFriendShipUsername in senderOfFriendship.get("sentRequests", []):
        return jsonify(error="It send, they have not answered"), 400

    # Waiting for a response
    if player in receiverOfFriendshio.get("friendRequests", []):
        return jsonify(error="Request is pending, wait for an answer"), 400

    mongo.db.players.update_one({"username": player}, {"$addToSet": {"sentRequests": targetOfFriendShipUsername}})
    mongo.db.players.update_one({"username": targetOfFriendShipUsername}, {"$addToSet": {"friendRequests": player}})

    # print(f"[FRIEND REQUEST] {player} ➡ {target}") # for troubleshooting

    return jsonify({"success": True, "message": "Request sent"}), 200

# Get all incoming friend requests for the current user
@app.route('/friend-requests', methods=['GET'])
@jwt_required()
def getterForfriendRequests():
    player = get_jwt_identity()
    OtherPlayer = mongo.db.players.find_one({"username": player})

    requestsPending = OtherPlayer.get("friendRequests", [])
    players = list(
        mongo.db.players.find({"username": {"$in": requestsPending}}, {"_id": 0, "username": 1, "picture": 1})
        ) 
    return jsonify(success=True, friend_requests=players), 200

# Get the current player's friends
@app.route('/get-friends', methods=['GET'])
@jwt_required()
def gettingFriends():
    player = get_jwt_identity()
    players = mongo.db.players.find_one({"username": player})
    friends = players.get("friends", [])
    formatted = list(mongo.db.players.find({"username": {"$in": friends}}, {"_id": 0, "username": 1, "picture": 1}))
    return jsonify({"success": True, "friends": formatted}), 200

# Accept a friend request
@app.route('/accept-friend-request', methods=['POST'])
@jwt_required()
def acceptingfriendship():
    player = get_jwt_identity()
    username = request.json.get("username")

    mongo.db.players.update_one({"username": player}, {
        "$pull": {"friendRequests": username},
        "$addToSet": {"friends": username}
    })

    mongo.db.players.update_one({"username": username}, {
        "$pull": {"sentRequests": player},
        "$addToSet": {"friends": player}
    })

    return jsonify(success=True, message="Friend request accepted"), 200

# Deny a friend request
@app.route('/deny-friend-request', methods=['POST'])
@jwt_required()
def deny_friend():
    player = get_jwt_identity()
    username = request.json.get("username")

    mongo.db.players.update_one({"username": player}, {"$pull": {"friendRequests": username}})
    mongo.db.players.update_one({"username": username}, {"$pull": {"sentRequests": player}})

    return jsonify({"success": True, "message": "Friend request denied"}), 200

# Remove a friend from your friends list #friendshipended
@app.route('/remove-friend', methods=['POST'])
@jwt_required()
def remove_friend():
    player = get_jwt_identity()
    username = request.json.get("username")

    mongo.db.players.update_one({"username": player}, {"$pull": {"friends": username}})
    mongo.db.players.update_one({"username": username}, {"$pull": {"friends": player}})

    return jsonify({"success": True, "message": f"{username} has been removed as your friend"}), 200

## Group System - the group system allows users to create and join groups, manage members, and chat within groups

# Create a new group with a password (admin is the creator)
@app.route('/create-group', methods=['POST'])
@jwt_required()
def createingGroup():
    player = get_jwt_identity()
    data = request.get_json()
    group_name = data.get("name")
    password = data.get("password")

    if not group_name or not password:
        return jsonify(error="Its need both a group name and a password"), 400

    existing = mongo.db.groups.find_one({"name": group_name})
    if existing:
        return jsonify(error="Group name, that has been chosen is sadly already taken"), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    mongo.db.groups.insert_one({
        "name": group_name,
        "password": hashed_password,
        "members": [player], # Start with the creator as the only member
        "admin": player
    })

    # print(f"[GROUP CREATED] '{group_name}' and was created by {player}")
    ## Remove these comments if need to troubleshoot again

    return jsonify({"success": True, "message": "Group created"}), 201

# Join an existing group by name and password
@app.route('/join-group', methods=['POST'])
@jwt_required()
def joiningAGroup():
    player = get_jwt_identity()
    data = request.get_json()
    group_name = data.get("name")
    password = data.get("password")

    group = mongo.db.groups.find_one({"name": group_name})
    if not group:
        return jsonify(error="This group can not be found"), 404

    # this ensure that the password is correct
    if not bcrypt.check_password_hash(group["password"], password):
        return jsonify(error="The password you have typed is invalid"), 403

    # already in the group
    if player in group.get("members", []):
        return jsonify(error="You are in this group already"), 400

    mongo.db.groups.update_one(
        {"name": group_name},
        {"$addToSet": {"members": player}}
    )

    return jsonify({"success": True, "message": "Joined group"}), 200

# Remove a member from a group (admin only) - think gandalf the grey and the balrog "You shall not pass!"
@app.route('/remove-member', methods=['POST'])
@jwt_required()
def remove_member():
    player = get_jwt_identity()
    data = request.get_json()
    group_name = data.get("group")
    target_user = data.get("username")

    group = mongo.db.groups.find_one({"name": group_name})
    if not group:
        return jsonify({"success": False, "error": "Group not found"}), 404

    if group.get("admin") != player:
        return jsonify({"success": False, "error": "Only admin can remove members"}), 403

    mongo.db.groups.update_one(
        {"name": group_name},
        {"$pull": {"members": target_user}}
    )

    return jsonify({"success": True, "message": "Member removed"}), 200

# Search for groups by name with case-insensitive matching
@app.route('/search-groups/<query>', methods=['GET'])
@jwt_required()
def search_groups(query):
    groups = mongo.db.groups.find(
        {"name": {"$regex": query, "$options": "i"}},
        {"_id": 0, "name": 1}
    )
    return jsonify({"success": True, "groups": list(groups)}), 200

# Get all groups the current user is a member of
@app.route('/players-groups', methods=['GET'])
@jwt_required()
def Playersgroups():
    player = get_jwt_identity()
    groups = list(mongo.db.groups.find(
        {"members": player},
        {"_id": 0, "name": 1, "admin": 1, "members": 1}
    ))
    return jsonify({"success": True, "groups": groups}), 200

# Get all members of a specific group
@app.route('/group-members/<groupname>', methods=['GET'])
@jwt_required()
def gettingTheGroupMembers(groupname):
    group = mongo.db.groups.find_one({"name": groupname})
    if not group:
        return jsonify({"success": False, "error": "Group not found"}), 404

    return jsonify({"success": True, "members": group.get("members", [])}), 200

## Chat System - the chat system allows users to communicate with friends and groups in profile page

# Get chat messages for a friend or group chat
@app.route('/chat/<chat_type>/<target>', methods=['GET'])
@jwt_required()
def gettingThechat(chat_type, target):
    player = get_jwt_identity()

    if chat_type == 'friend':
        key = sorted([player, target])
        chat = mongo.db.friend_chats.find_one({"participants": key})
        messages = chat.get('messages', []) if chat else []
    else:
        group = mongo.db.groups.find_one({"name": target})
        if not group or player not in group.get('members', []):
            return jsonify({"success": False, "error": "Access denied"}), 403
        chat = mongo.db.group_chats.find_one({"group": target})
        messages = chat.get('messages', []) if chat else []

    return jsonify({"success": True, "messages": messages}), 200

# Post a new message to a friend or group chat (keeps only last 20 messages)
@app.route('/chat/<chat_type>/<target>', methods=['POST'])
@jwt_required()
def postingInChat(chat_type, target):
    player = get_jwt_identity()
    data = request.get_json()
    message = data.get('message')

    new_message = {
        "sender": player,
        "text": message
    }

    if chat_type == 'friend':
        key = sorted([player, target])
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
        if not group or player not in group.get('members', []):
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
def gettingbogushintFromHead():
    allHints = list(mongo.db.hints.find())
    if not allHints:
        return jsonify({"text": "No hints found."}), 404
    return jsonify(random.choice(allHints))

# Get a random bogus phone line from detective
@app.route('/phoneline', methods=['GET'])
def getRandomphonelineFromDetective():
    lines = list(mongo.db.phonelines.find())
    if not lines:
        return jsonify({"success": False, "message": "No phone lines found."}), 404
    return jsonify({"success": True, "message": random.choice(lines).get("message", "")})

## Public User - the getter for public profiles

# Get a public profile for any user (shows friends and groups too)
@app.route('/public-profile/<username>', methods=['GET'])
@jwt_required()
def gettongTopublicprofile(username):
    OtherPlayer = mongo.db.players.find_one(
        {"username": username},
        {"_id": 0, "password": 0, "sentRequests": 0, "friendRequests": 0}
    )
    if not OtherPlayer:
        return jsonify({"success": False, "error": "User not found"}), 404

    friend_usernames = OtherPlayer.get("friends", [])
    friends = list(mongo.db.players.find(
        {"username": {"$in": friend_usernames}},
        {"_id": 0, "username": 1, "picture": 1}
    ))

    groups = list(mongo.db.groups.find(
        {"members": username},
        {"_id": 0, "name": 1}
    ))

    OtherPlayer["friends"] = friends
    OtherPlayer["groups"] = [g["name"] for g in groups]

    return jsonify({"success": True, "user": OtherPlayer}), 200

## Streak Reset Scheduler - ensures users streaks are reset if they miss a daily puzzle

# Every night, reset streaks for users who missed that day's puzzle
def resetstreaksfromplayers():
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    players = mongo.db.players.find()
    
    for user in players:
        name = user["username"]
        playedToday = mongo.db.daily_attempts.find_one({"username": name, "date": yesterday})
        if not playedToday:
            mongo.db.players.update_one({"username": name}, {
                "$set": {"streak.current": 0}
            })
            print(f"[STREAK RESET] {name}'s streak has been reset to 0 for missing yesterday's puzzle.")



# Schedule the streak reset to run daily at 00:05 UTC - this is 1:05 AM CET did not bother to change it
scheduler = BackgroundScheduler()
scheduler.add_job(func=resetstreaksfromplayers, trigger="cron", hour=0, minute=5)
scheduler.start()

## Stamps - the categories being marked as completed for the user 

# Mark a category as completed for the user (adds a "stamp")
@app.route('/complete-category', methods=['POST'])
@jwt_required()
def completeCategory():
    player = get_jwt_identity()
    data = request.get_json()
    category = data.get("category")

    if not category:
        return jsonify({"success": False, "error": "Missing category"}), 400

    mongo.db.players.update_one(
        {"username": player},
        {"$addToSet": {"stamps": category}}
    )

    return jsonify({"success": True, "message": f"Category '{category}' recorded"}), 200

## Start the Flask app - Look for print statements to confirm it's running
if __name__ == '__main__':
    print("Starting Flask app on http://127.0.0.1:5000 - so it running now")
    app.run(debug=True)