import pymongo
from flask_bcrypt import Bcrypt
import os
from dotenv import load_dotenv


load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

client = pymongo.MongoClient(MONGO_URI)
db = client["crackthecode"]
players = db["players"]

bcrypt = Bcrypt()

while True:
    username = input("Username: ").strip()
    player = players.find_one({"username": username})
    if player:
        break
    print("Player was not found. Please try again.")

pw = input("Type new password: ").strip()

# Hash the new password
hashed = bcrypt.generate_password_hash(pw).decode('utf-8')

# Update the user's password
res = players.update_one(
    {"username": username},
    {"$set": {"password": hashed}}
)

if res.modified_count:
    print("Password changed.")
else:
    print("Password was not changed.")
