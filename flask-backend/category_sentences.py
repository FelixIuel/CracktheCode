## Script to add new puzzles to a specific category collection in the Crack the Code database.
## Make sure MongoDB is running and pymongo is installed.
## Run this script, enter the category (collection) name, and add puzzles if the collection exists.

import pymongo
import random
import string

# Setup MongoDB connection
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["crackthecode"]

def generate_letter_map():
    alphabet = list(string.ascii_lowercase)
    numbers = random.sample(range(1, 27), 26)
    return {letter: numbers[i] for i, letter in enumerate(alphabet)}

def get_revealed_letters(sentence, count=3):
    letters = list(set([char.lower() for char in sentence if char.isalpha()]))
    revealed = random.sample(letters, min(count, len(letters)))
    return revealed

def main():
    print("\n=== Add Puzzles to a Category ===")
    category = input("Enter the category (collection) you want to add puzzles to: ").strip()
    if category not in db.list_collection_names():
        print(f"Collection '{category}' does not exist. Please create it first or check the name.")
        return

    collection = db[category]
    while True:
        print("\n--- Add New Puzzle ---")
        sentence = input("Enter the sentence (or leave blank to quit): ").strip()
        if not sentence:
            print("Exiting.")
            break
        hint = input("Enter the hint: ").strip()

        letter_map = generate_letter_map()
        revealed_letters = get_revealed_letters(sentence, random.randint(2, 4))

        # Show preview for confirmation
        print("\n--- Preview ---")
        print(f"Category/Collection: {category}")
        print(f"Sentence: {sentence}")
        print(f"Hint: {hint}")
        print(f"Revealed Letters: {revealed_letters}")
        print("----------------------")

        confirm = input("Is this correct? (y/n): ").strip().lower()
        if confirm == 'y':
            doc = {
                "sentence": sentence,
                "category": category,
                "hint": hint,
                "letterMap": letter_map,
                "revealedLetters": revealed_letters
            }
            collection.insert_one(doc)
            print("Puzzle added to the database!")
        else:
            print("Puzzle was not added to the database!")

if __name__ == "__main__":
    main()