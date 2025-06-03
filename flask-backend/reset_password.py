import pymongo
from flask_bcrypt import Bcrypt

# Setup MongoDB connection
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["crackthecode"]
users = db["users"]

bcrypt = Bcrypt()

username = input("Enter the username: ").strip()
new_password = input("Enter the new password: ").strip()

hashed_pw = bcrypt.generate_password_hash(new_password).decode('utf-8')

result = users.update_one(
    {"username": username},
    {"$set": {"password": hashed_pw}}
)

if result.modified_count:
    print("Password updated successfully!")
else:
    print("User not found or password not changed.")