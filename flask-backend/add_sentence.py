import pymongo
import random
import string
import os
from dotenv import load_dotenv


load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

client = pymongo.MongoClient(MONGO_URI)
db = client["crackthecode"]
collection = db["sentences"]

# Getting the letter map for the sentences
def makingTheLetterMap():
    letters = string.ascii_lowercase
    shuffled = random.sample(range(1, 27), 26)
    map_ = {}
    for idx, ch in enumerate(letters):
        map_[ch] = shuffled[idx]
    return map_

# Getting it to pick a random selection of letters from the sentence
def LetterRandomiser(sentence, how_many=3):
    unique = list(set([c.lower() for c in sentence if c.isalpha()]))
    if not unique:
        return []
    return random.sample(unique, min(how_many, len(unique)))

def main():
    while True:
        print("\nNew Sentences to put in")
        sentence = input("sentence: ").strip()
        category = input("Category: ").strip()
        hint = input("Hint: ").strip()

        Lettermapping = makingTheLetterMap()
        showLetters = LetterRandomiser(sentence, random.randint(2, 4))

        # Show a quick preview
        print("\nThe new sentences:")
        print(f"Sentence: {sentence}")
        print(f"Category: {category}")
        print(f"Hint: {hint}")
        print(f"Revealed Letters: {showLetters}")

        confirm = input("Is this okay? (type y): ").strip().lower()
        if confirm == 'y':
            doc = {
                "sentence": sentence,
                "category": category,
                "hint": hint,
                "letterMap": Lettermapping,
                "revealedLetters": showLetters
            }
            collection.insert_one(doc)
            print("Saved successfully.")
        else:
            print("Entry discarded.")

if __name__ == "__main__":
    main()
