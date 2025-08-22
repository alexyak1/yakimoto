# 🛍️ Yakimoto Dojo E-commerce Platform

This is the official codebase for the Yakimoto Dojo online store — a custom e-commerce solution focused on judo apparel and accessories.

---

## 🧰 Tech Stack

### Frontend

- **React** – JavaScript library for building modern UIs
- **Tailwind CSS** – Utility-first CSS framework for styling
- **react-router-dom** – Routing library for SPA navigation
- **axios** – Promise-based HTTP client for browser and Node.js
- **react-hook-form** – Performant form state management
- **zustand** – Lightweight state management (if used)

### Backend

- **FastAPI** – Modern, fast (high-performance) web framework for building APIs with Python 3.7+
- **SQLAlchemy** – ORM for database access
- **PostgreSQL** – Relational database used for storing shop data
- **Alembic** – Database migration tool for SQLAlchemy
- **Uvicorn** – ASGI server for running FastAPI apps

### DevOps & Tooling

- **Docker** – Containerization of backend and frontend services
- **Docker Compose** – Orchestrating multi-container applications
- **Git** – Version control system
- **prettier** – Code formatter
- **eslint** – JavaScript/React linting

---

## 🚀 Run with Docker

### Dev (hot-reload)

Default compose file is used for development:

```bash
docker compose up --build
```

Frontend → http://localhost:5173
Backend API → http://localhost:8000
Swagger UI → http://localhost:8000/docs

Stop:

```bash
docker compose down
```

### Prod
Use the production override file:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```
Stop:

```bash
docker compose -f docker-compose.prod.yml down
```