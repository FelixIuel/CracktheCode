# Crack the Code

**Author:** Felix Iuel  
**Course:** Web Programming 

## Starting the project
---

### Prerequisites

Make sure you have the following installed:

- Node.js (v18 or later)  
- Python 3.10 or higher  
- MongoDB Atlas / you need to ensure you are connect to the internet

---

### 1. Start the Flask Backend

1. Open a terminal.  
2. Navigate to the backend folder:  
   `cd flask-backend`  

3. Create and activate a virtual environment:  

   - On **Windows**:  
     `python -m venv venv`  
     `venv\Scripts\activate`

   - On **Mac/Linux**:  
     `python3 -m venv venv`  
     `source venv/bin/activate`

4. Install dependencies:  
   `pip install -r requirements.txt`

5. Run the backend server:  
   `python app.py`

The backend will be available at: [http://127.0.0.01:500] / [http://localhost:5000]

---

## 2. Start the React Frontend

1. Open a new terminal window.

2. Navigate to the called src:  
   `cd src`

3. Install frontend dependencies:  
   `npm install`

4. Start the development server:  
   `npm start`

The frontend will run at: [http://localhost:3000]

---

## API Connection

The frontend communicates with the backend using an environment variable configured in `src/.env`:

```
REACT_APP_API_URL=http://localhost:5000
```

All API requests in React use this base URL.