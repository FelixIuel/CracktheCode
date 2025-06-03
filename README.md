# CrackTheCode

CrackTheCode is a web puzzle game where players test their logic and deduction skills by decoding a hidden sentence. Each letter in the sentence is masked behind a box with a corresponding number, and players must figure out which numbers map to which letters. To assist, a theme and a clue are provided with every puzzle.

To support the puzzle, there are also other pages for social interaction and fun.

The game offers a clean and interactive UI built with React, a secure and efficient backend with Flask, and persistent data handling using MongoDB.

---

## Game Objective

Uncover the secret sentence by guessing the correct letter for each number-coded box. Use the theme and hint provided to make strategic deductions.

---

## Game Modes

1. **Endless Run**  
   Figure out as many sentences as possible before running out of lives. Track your score on the Scoreboard tab.

2. **Daily Sentence**  
   A new sentence appears each day from the ZenQuotes API. Track your daily streak and highest score on your profile page.

3. **Categories**  
   Complete all sentences in a category to unlock a unique stamp.

---

## Page Layout

- Play
  - Endless Run
  - Daily Sentence
  - Categories
- How to Play
- Scoreboard
- Profile

---

## Extra Features

- Customize your profile
- Add friends, join groups, and chat

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v18+)
- [Python 3.10+](https://www.python.org/)
- [MongoDB](https://www.mongodb.com/try/download/community) running locally
- MongoDB Database Tools (for `mongorestore`) — [download here](https://www.mongodb.com/try/download/database-tools)

---

## Installation

### 1️: Clone the Repository

```bash
git clone https://github.com/FelixIuel/Crackthecode.git
cd Crackthecode
```

---

### 2️: Setup Flask Backend

#### **On Windows**
```bash
cd flask-backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### **On Mac/Linux**
```bash
cd flask-backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### 2.5: Configure Backend Environment Variables

Create a `.env` file in the `flask-backend/` folder with at least:

```
JWT_SECRET_KEY=your_secret_key
```
Add any other required variables as needed.

---

### 3️: (Optional) Import Example Database

If you want to start with example data and you have a database dump, use:

```bash
mongorestore --db crackthecode dump/crackthecode
```
Or skip this step to start with an empty database.

---

### 4️: Start the Flask Backend

#### **On Windows**
```bash
cd flask-backend
venv\Scripts\activate
python app.py
```

#### **On Mac/Linux**
```bash
cd flask-backend
source venv/bin/activate
python app.py
```
The backend will run at [http://localhost:5000](http://localhost:5000).

---

### 5️: Setup and Start the React Frontend

```bash
npm install
npm start
```
The frontend will run at [http://localhost:3000](http://localhost:3000).

If your frontend needs environment variables (like `REACT_APP_API_URL`), create a `.env` file in the `frontend/` folder.

---

## Running Both Servers

- **Backend:** Run `python app.py` (or `python3 app.py`) in one terminal (from `flask-backend`).
- **Frontend:** Run `npm start` in another terminal (from `frontend`).

---

## Accessing the App

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## File Structure

```
Crackthecode/
├── flask-backend/
│   ├── app.py
│   ├── requirements.txt
│   └── ... (backend scripts and modules)
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

---

## Troubleshooting & FAQ

**Q: MongoDB connection error?**  
A: Make sure MongoDB is running locally, or update the connection string in `flask-backend/app.py` to point to your MongoDB instance.

**Q: CORS errors?**  
A: Ensure Flask-CORS is installed and enabled in your backend.

**Q: Port already in use?**  
A: Make sure nothing else is running on ports 3000 (frontend) or 5000 (backend).

**Q: Environment variable errors?**  
A: Double-check your `.env` files in both backend and frontend folders.


