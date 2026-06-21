# AquaFeed - Fisheries Feed Management System

AquaFeed is a full-stack Fisheries Feed Management System designed to manage feed inventory, monitor feed consumption, track stock levels, manage tanks, and generate reports for aquaculture operations.

## Live Demo

**Frontend (Vercel)**
https://aquafeed-front.vercel.app

**Backend API (Railway)**
https://fisheries-feed-api-production.up.railway.app/api/test

---

## Project Overview

AquaFeed helps fisheries and aquaculture farms efficiently manage feed stock, feeding operations, tank information, and inventory analytics through a centralized web application.

The system provides real-time inventory tracking, feeding logs, audit trails, dashboard analytics, and reporting features while maintaining secure authentication and role-based access control.

---

## Key Features

### Authentication & Security

* User Registration
* User Login
* JWT Authentication
* Protected API Endpoints
* Session Persistence

### Feed Management

* Feed Type Management
* Feed Stock Tracking
* Feed Inventory History
* Low Stock Alerts

### Tank Management

* Add Tanks
* Update Tank Information
* Delete Tanks
* Tank Feed Tracking

### Feed Operations

* Feed Consumption Logging
* Feeding History Tracking
* Daily Feed Monitoring

### Analytics & Reporting

* Dashboard Statistics
* Feed Consumption Analytics
* Inventory Reports
* Audit Trail Monitoring

### Timezone Support

* Indian Standard Time (IST)
* Consistent Date & Time Formatting
* Production-Ready Timestamp Handling

---

## Tech Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* Axios
* Recharts

### Backend

* Python
* Flask
* Flask-CORS
* JWT Authentication

### Database

* MySQL

### Deployment

* Vercel (Frontend)
* Railway (Backend)

---

## System Architecture

Frontend (React + Vite)

↓

REST API (Flask)

↓

MySQL Database

↓

Railway Deployment

---

## Screenshots

### Login Page

   
<img width="1012" height="816" alt="Login" src="https://github.com/user-attachments/assets/e6db1786-4974-4d71-8174-01e602d41064" />

### Dashboard

<img width="1893" height="903" alt="Dashboard" src="https://github.com/user-attachments/assets/1c1a04a7-73d3-45c5-ae0d-f2e14d273119" />


### Feed Stock Management

<img width="1911" height="905" alt="Add Stock" src="https://github.com/user-attachments/assets/9521074a-5e5f-41f9-9246-6c51cbd5bd6a" />


### Feed Entry

<img width="1895" height="902" alt="Feed Entry" src="https://github.com/user-attachments/assets/cb9c439f-1822-4ef8-ae4f-fda0a3b3db4e" />


### Reports

<img width="1907" height="897" alt="Report" src="https://github.com/user-attachments/assets/f11b4a70-fa7f-4d28-8bd2-4c82c2ad2491" />


---

## Project Structure

```text
fisheries-feed-api/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── app.py
├── requirements.txt
├── README.md
│
└── database/
```

## Installation

### Clone Repository

```bash
git clone https://github.com/Madhantn70/fisheries-feed-api.git

cd fisheries-feed-api
```

### Backend Setup

```bash
pip install -r requirements.txt

python app.py
```

Backend runs at:

```text
http://127.0.0.1:5000
```

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

## Environment Variables

### Frontend (.env)

```env
VITE_API_URL=https://fisheries-feed-api-production.up.railway.app/api
```

### Backend

```env
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=feed_management

JWT_SECRET_KEY=your_secret_key
```

---

## API Endpoints

### Authentication

```http
POST /api/auth/signup
POST /api/auth/login
```

### Feed Stock

```http
GET /api/feed-stock
POST /api/feed-stock
```

### Feed Logs

```http
GET /api/feed-logs
POST /api/feed-logs
```

### Tanks

```http
GET /api/tanks
POST /api/tanks
PUT /api/tanks/<id>
DELETE /api/tanks/<id>
```

### Dashboard

```http
GET /api/dashboard
GET /api/low-stock
```

### Reports

```http
GET /api/reports
```

---

## Challenges Solved

During development, the following production challenges were successfully resolved:

* Railway MySQL Connectivity Issues
* Database Migration Problems
* JWT Authentication Errors
* Git Tracking and Deployment Issues
* Vercel Build Failures
* CORS Configuration Problems
* Timezone Conversion Issues
* Inventory Timestamp Accuracy

---

## Future Enhancements

* Email Notifications
* Password Reset Functionality
* Advanced Analytics Dashboard
* Mobile Responsive Improvements
* Multi-Role User Access
* Export Reports to PDF
* Automated Backup System

---

## Author

**Madhan Thulasi Nagamanikkam**

B.E. Electronics and Communication Engineering

Government College of Engineering, Erode

### Skills Demonstrated

* Full Stack Development
* React.js Development
* Flask API Development
* MySQL Database Design
* JWT Authentication
* Deployment & DevOps
* Production Debugging
* REST API Development
* Git & GitHub Workflow
* Railway & Vercel Deployment
