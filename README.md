# AquaFeed

A web-based feed management system for aquaculture operations. AquaFeed helps manage feed inventory, tanks, feeding records, and operational reports through a centralized dashboard.

## Live Application

https://aquafeed-frontend.vercel.app/

## Overview

AquaFeed is designed to simplify day-to-day feed management in aquaculture facilities by maintaining structured records of feed stock, feed usage, and tank operations.

The system provides role-based access and connects a React frontend with a Flask REST API and MySQL database.

## Features

- User registration and authentication
- Role-based access control
- Feed type management
- Tank management
- Feed stock management
- Feed usage logging
- Low-stock monitoring
- Dashboard with inventory and consumption statistics
- Audit logging
- PDF report generation
- Responsive web interface

## System Architecture

```text
React Frontend
      │
      │ REST API
      ▼
Flask Backend
      │
      │ MySQL
      ▼
Aiven Database
## Technology Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Axios
- React Router

### Backend
- Python
- Flask
- Flask-CORS
- JWT Authentication
- Gunicorn

### Database
- MySQL
- Aiven

### Deployment
- Vercel — Frontend
- Render — Backend
- Aiven — Database

## System Architecture

```text
React Frontend
      │
      │ REST API
      ▼
Flask Backend
      │
      │ MySQL
      ▼
Aiven Database
