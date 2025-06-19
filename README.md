# Excel Analytics Platform - Server

This is the **backend (server)** for the Excel Analytics Platform. It provides RESTful APIs for authentication, file upload, chart generation, AI insights, user management, and admin analytics.

---

## 🚀 Features
- User authentication (JWT, role-based)
- File upload (Excel, CSV)
- Chart generation (2D/3D)
- AI-powered insights
- User history and analytics
- Admin dashboard (user management, platform stats, export)
- MongoDB Atlas integration
- Secure, production-ready Express.js setup

---

## 🛠️ Setup & Installation

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd server
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Environment variables:**
   - Copy `.env.example` to `.env` and fill in your MongoDB URI and other secrets.

4. **Start the server:**
   ```sh
   npm start
   # or for development with auto-reload
   npm run dev
   ```

---

## ⚙️ Environment Variables

Create a `.env` file in the `server` directory:

```
MONGODB_URI=your_mongodb_atlas_uri
PORT=5000
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_jwt_secret
```

---

## 📦 Scripts

- `npm start` — Start server (production)
- `npm run dev` — Start server with nodemon (development)
- `npm run create-admin` — Create an initial admin user

---

## 📚 API Endpoints

### **Auth**
- `POST   /api/auth/register` — Register
- `POST   /api/auth/login` — Login
- `GET    /api/auth/profile` — Get profile
- `PUT    /api/auth/profile` — Update profile

### **File Upload & Analysis**
- `POST   /api/excel/upload` — Upload Excel/CSV
- `GET    /api/excel/files` — List uploaded files
- `POST   /api/analysis/generate` — Generate chart/insight

### **Admin**
- `GET    /api/admin/users` — List all users
- `PUT    /api/admin/users/:id` — Update user
- `DELETE /api/admin/users/:id` — Delete user
- `GET    /api/admin/stats` — Platform stats
- `GET    /api/admin/analytics` — Analytics
- `GET    /api/admin/export` — Export user data (CSV/JSON)

---

## 🧑‍💻 Tech Stack
- Node.js, Express.js
- MongoDB (Mongoose)
- JWT Auth
- Multer (file upload)
- json2csv (export)
- dotenv, cors, bcryptjs

---

## 📄 License
MIT 