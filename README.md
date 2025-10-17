# 🥖 DoughNation

**DoughNation** is a cross-platform, web-based system that connects **local bakeries** with **nearby charities** to donate unsold or soon-to-expire breads.  
The platform promotes **zero-waste food management**, **community support**, and **sustainability** through efficient and location-based technology.

---

## 🚀 Features

### 👩‍🍳 For Bakeries
- 🏷️ **Inventory Management** – Upload unsold breads with images, descriptions, expiration and threshold dates.
- 👥 **Employee Management** – Add employees, assign roles (Manager/Staff), and track item uploads.
- 📊 **Gamified Dashboard** – Earn badges and leaderboard points for consistent donations.
- 📦 **Donation Scheduling** – Choose charities, set pickup/delivery times.

### ❤️ For Charities
- 🍞 **Donation Requests** – View nearby bakery listings and request donations.
- 🚨 **Geofencing Notifications** – Receive alerts when donations are available within your area or pickup zone.
- 🕒 **Tracking & Notifications** – Get updates on donation approvals, status, and delivery tracking.

### 🛡️ For Admins
- 🧾 **User Verification** – Validate bakery and charity documents.
- 🧭 **Analytics Dashboard** – Monitor activity, donations, and user engagement.
- ⚙️ **System Management** – Manage all users, donations, and reports.

---

## 🧠 Core Technologies

| Layer | Tech Stack |
|-------|-------------|
| **Frontend** | React.js, Tailwind CSS, Axios, SweetAlert2, Leaflet.js |
| **Backend** | FastAPI (Python), SQLAlchemy ORM, JWT Authentication |
| **Database** | PostgreSQL |
| **Deployment** | Nginx (Reverse Proxy), Uvicorn, Docker (optional) |
| **Security** | Role-Based Access Control (RBAC), Email Verification, File Upload Validation |
| **Logic** | Gamification (Badges, Leaderboard), Expiration Monitoring, Geofencing Notifications |

---

## 🧩 System Modules

### 🏪 Bakery Module
- Manage inventory and employees
- Upload product images via form-data
- Track donation history and achievements

### 🏛️ Charity Module
- Request donations
- Receive notifications for accepted and completed donations
- Get real-time alerts through geofencing and status updates

### 🧑‍💼 Admin Module
- Approve/decline registration proofs
- Manage users, donations, and reports
- Generate analytics for impact measurement

---

## ⚙️ Installation Guide

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<your-username>/DoughNation.git
cd DoughNation
```

### 2️⃣ Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend runs on: http://localhost:8000

### 3️⃣ Frontend Setup (React + Tailwind)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:5173

---

## 🗂️ Project Structure

```
DoughNation/
│
├── backend/
│ ├── app/
│ │ ├── main.py
│ │ ├── models.py
│ │ ├── routes/
│ │ ├── auth/
│ │ ├── database.py
│ │ └── schemas/
│ ├── static/
│ │ └── uploads/
│ └── requirements.txt
│
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── utils/
│ │ └── App.jsx
│ ├── public/
│ └── package.json
│
└── README.md
```

---

## 🔒 Security Features
- JWT-based Authentication and Authorization
- Role-Based Access Control (Bakery / Charity / Admin)
- File and image upload validation
- Secure password hashing
- Email domain
- CORS and WebSocket firewall configuration

---

## 👨‍💻 Developers

| Name | Role | Contact |
|------|------|----------|
| **Christian John Hipolito** | Full Stack Developer | 📧 [jnistianhipolitov7@gmail.com](mailto:jnistianhipolitov7@gmail.com) |
| **Syranne Jahziel Maestro** | UI/UX / Project Lead | 📧 [smaestro.college@gmail.com](mailto:smaestro.college@gmail.com) |
| **Justin Paul Morada** | Full Stack Developer / Main Developer | 📧 [justinpaulmorada969@gmail.com](mailto:justinpaulmorada969@gmail.com) |
| **Irish Reignette Valmadrid** | UI/UX Designer | 📧 [irishreignette@gmail.com](mailto:irishreignette@gmail.com) |


---

## 📜 License
This project is licensed under the MIT License — feel free to use, modify, and distribute with attribution.
