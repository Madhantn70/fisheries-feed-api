# Fisheries Feed Management System - Backend API

## Project Overview
This project is a standalone Flask-based backend API for a Fisheries Feed Management System. It provides robust endpoints to manage feed types, track feeding logs, and monitor stock levels across different tanks. The API returns standardized JSON responses and is designed to connect seamlessly to a MySQL database.

## Tech Stack
- **Framework:** Python, Flask
- **Database:** MySQL
- **Database Connector:** `mysql-connector-python`

## Features
- **Tanks Management:** Add, update, view, and delete tanks (with cascade logic for safely deleting associated logs).
- **Feed Stock Management:** Register incoming feed stock additions.
- **Feed Logs:** Track daily feeding amounts per tank.
- **Dashboard Analytics:** Calculates total stock added, total used, and dynamically derives the current available stock.
- **Low Stock Alerts:** Automatically flags feed types where current stock drops below 200 units.

## Project Structure
```text
fisheries-feed-api/
│
├── app.py                  # Main application file containing all API routes
├── requirements.txt        # Dependencies needed to run the project
├── .gitignore              # Standard git ignores for Python projects
└── README.md               # Project documentation
```

## Setup Instructions

### 1. Prerequisites
- Python 3.8+
- MySQL Server

### 2. Database Setup
1. Create a MySQL database named `feed_management`.
2. Ensure you have the `feed_types`, `tanks`, `feed_stock`, and `feed_logs` tables set up.
3. Update the database credentials in `app.py` (inside the `get_db_connection` function) to match your local MySQL setup:
   ```python
   host="localhost",
   user="root",
   password="YourPasswordHere",  # Change this to your local MySQL password
   database="feed_management"
   ```

### 3. Running the Project Locally
1. **Open a terminal** in the project directory.
2. **Create a virtual environment** (optional but highly recommended):
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the Flask application:**
   ```bash
   python app.py
   ```
5. The API will start running at `http://127.0.0.1:5000`.

## API Endpoints Summary
- `GET /api/test` - Test if the API is running
- `GET /api/feed-types` - Fetch all feed types
- `GET /api/tanks` - Fetch all tanks
- `POST /api/tanks` - Add a new tank
- `PUT /api/tanks/<id>` - Update an existing tank
- `DELETE /api/tanks/<id>` - Delete a tank and its associated feed logs
- `POST /api/feed-stock` - Add new feed stock
- `POST /api/feed-logs` - Log a feeding event
- `GET /api/feed-logs` - Fetch all feeding logs
- `GET /api/dashboard` - Get overall stock analytics
- `GET /api/low-stock` - Get feed types that are low in stock
