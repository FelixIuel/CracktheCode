# CrackTheCode

CrackTheCode is a web puzzle game where players test their logic and deduction skills by decoding a hidden sentence. Each letter in the sentence is masked behind a box with a corresponding number, and players must figure out which numbers map to which letters. To assist, a theme and a clue are provided with every puzzle.

The game offers a clean and interactive UI built with React, a secure and efficient backend with Flask, and persistent data handling using MongoDB Atlas.

---

## Game Modes

- **Endless Run:** Figure out as many sentences as possible before running out of lives. Track your score on the Scoreboard tab.
- **Daily Sentence:** A new sentence appears each day from the ZenQuotes API. Track your daily streak and highest score on your profile page.
- **Categories:** Complete all sentences in a category to unlock a unique stamp.

---

## Features

- User authentication (JWT)
- Profile customization
- Friends, groups, and chat system
- Daily and endless puzzles
- Scoreboard and streak tracking

---

## Project Structure

```
Crackthecode/
├── flask-backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   └── ... (backend scripts and modules)
├── src/
│   ├── App.js
│   ├── ... (React components and assets)
└── README.md
```

---

## Getting Started (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18+)
- [Python 3.10+](https://www.python.org/)
- [MongoDB Atlas](https://www.mongodb.com/atlas/database) account and cluster

---

### 1. Clone the Repository

```bash
git clone https://github.com/FelixIuel/Crackthecode.git
cd Crackthecode
```

---

### 2. Setup Flask Backend

```bash
cd flask-backend
python -m venv venv
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On Mac/Linux

pip install -r requirements.txt
```

#### Configure Backend Environment Variables

Create a `.env` file in `flask-backend/` with at least:

```
JWT_SECRET_KEY=your_secret_key
MONGO_URI=your_mongodb_atlas_connection_string
```

---

### 3. Start the Flask Backend

```bash
cd flask-backend
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On Mac/Linux

python app.py
```

The backend will run at [http://localhost:5000](http://localhost:5000).

---

### 4. Setup and Start the React Frontend

```bash
cd ../src
npm install
npm start
```

The frontend will run at [http://localhost:3000](http://localhost:3000).

#### API URL Configuration

For best practice, set the backend API URL using an environment variable. Create a `.env` file in `src/`:

```
REACT_APP_API_URL=http://localhost:5000
```

Update all API calls in your React code to use this variable, e.g.:

```js
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
fetch(`${API_URL}/login`, ...)
```

---

## Troubleshooting

- **MongoDB connection error:** Make sure your Atlas cluster is running and your connection string is correct.
- **CORS errors:** Ensure Flask-CORS is enabled and configured for your frontend domain.
- **API not reachable:** Double-check that your frontend is using the correct backend URL.