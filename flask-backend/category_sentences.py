import pymongo
import random
import string
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

client = pymongo.MongoClient(MONGO_URI)
db = client["crackthecode"]

def make_letter_map():
    alpha = string.ascii_lowercase
    nums = random.sample(range(1, 27), 26)
    return {ch: nums[i] for i, ch in enumerate(alpha)}

def pick_revealed(sentence, n=3):
    chars = [c.lower() for c in sentence if c.isalpha()]
    unique = list(set(chars))
    return random.sample(unique, min(n, len(unique))) if unique else []

def main():
    print("\n Choose a category for adding a sentence")
    category = input("What category: ").strip()
    if category not in db.list_collection_names():
        print(f"'{category}' was not found.")
        return

    collection = db[category]

    while True:
        print("\nType in the sentence")
        sentence = input("Sentence (leave blank to stop): ").strip()
        if not sentence:
            print("Done. Exiting.")
            break

        hint = input("Hint: ").strip()

        lmap = make_letter_map()
        Letterrevealed = pick_revealed(sentence, random.randint(2, 4))

        # Preview
        print("\nCheck your input:")
        print(f"Collection: {category}")
        print(f"Sentence: {sentence}")
        print(f"Hint: {hint}")
        print(f"Revealed: {Letterrevealed}")
        print("----------------")

        if input("Save it? (type y to save): ").strip().lower() == 'y':
            collection.insert_one({
                "sentence": sentence,
                "category": category,
                "hint": hint,
                "letterMap": lmap,
                "revealedLetters": Letterrevealed
            })
            print("Sentences has been Saved")
        else:
            print("Sentences not saved")

if __name__ == "__main__":
    main()
