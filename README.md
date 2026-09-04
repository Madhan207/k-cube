# K-CUBE Audit & FinServ Platform

A complete, production-ready Loan Management, Borrower KYC, Profile and Loan Agreement Generation web application designed for K-CUBE Audit & FinServ.

## Technology Stack

**Frontend:**
- React 18, Vite, React Router DOM
- Custom CSS System (Tailwind-free), Lucide React Icons
- React Query & Axios for state management and API communication

**Backend:**
- Django 5.x & Django REST Framework
- PostgreSQL (Primary Database)
- JWT Authentication (djangorestframework-simplejwt)
- python-docx & WeasyPrint (Document Generation)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (Reverse Proxy & Static Files)
- Gunicorn (WSGI Server)

## Core Features

1. **Borrower Portal & KYC:**
   - Multi-step registration.
   - Comprehensive KYC flow (PAN verification, Aadhaar verification).
   - Real-time loan application and payment schedule tracking.

2. **Loan Management Engine:**
   - Flexible interest calculation: **Flat Rate** or **Reducing Balance** (EMI).
   - Automated amortization schedule generation.
   - Dynamic payment frequency (Weekly, Fortnightly, Monthly).
   - Automatic allocation of payments to interest and principal.

3. **Digital Agreement Generation:**
   - Automatic generation of legally compliant loan agreements in DOCX and PDF formats based on templates.
   - Agreement versioning for secure record-keeping.

4. **Immutable Audit Logs:**
   - Full tracking of administrative and financial actions (Loan approvals, payments, agreement generation).

## Quick Start (Docker)

To run the entire stack locally using Docker:

1. Clone the repository.
2. Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

The application will be accessible at:
- **Frontend / Portal:** `http://localhost:80`
- **Backend API:** `http://localhost:80/api/`
- **Django Admin:** `http://localhost:80/admin/`

## Deployment

The provided `docker-compose.yml` and `nginx.conf` are configured for a production-like environment using Gunicorn and Nginx reverse proxy.
Make sure to secure your `.env` variables (Database credentials, Django Secret Key) before deploying to a production server.
