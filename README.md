# CMD Finance Portal — Cash Management Division

A secure, enterprise-grade financial management platform designed for the Cash Management Division (CMD), University of Sindh. Features automated bank reconciliation, fee audit categorization, multi-sheet Excel analytics, encrypted document vault, RBAC approval lifecycle, and Google OAuth 2.0.


---

## 🌟 Application Showcase

<div align="center">
  <img src="./features/cmd_app_full_overview.gif" alt="CMD Finance Portal Product Tour" width="900" style="border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

<table align="center">
  <tr>
    <td width="50%" align="center">
      <b>📊 Core Financial Tools</b><br/>
      <img src="./features/cmd_core_features.gif" alt="Financial Analytics & Reconciliation" width="440" style="border-radius: 8px;" />
    </td>
    <td width="50%" align="center">
      <b>🛡️ Governance & Admin Hub</b><br/>
      <img src="./features/cmd_admin_governance.gif" alt="RBAC & Audit Trail" width="440" style="border-radius: 8px;" />
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>📥 Smart Ingestion & Converters</b><br/>
      <img src="./features/cmd_ingestion_tools.gif" alt="Excel, TXT & JSON Converters" width="440" style="border-radius: 8px;" />
    </td>
    <td width="50%" align="center">
      <b>🔒 Document Vault</b><br/>
      <img src="./features/03_saved_files_vault.png" alt="Saved Files Storage Vault" width="440" style="border-radius: 8px;" />
    </td>
  </tr>
</table>

---

## 🚀 Quick Deployment Options

Choose the deployment method that best fits your environment:

| Method | Best For | Technical Level | Setup Time |
| :--- | :--- | :--- | :--- |
| **[1. Docker (Recommended)](#-method-1-docker-one-click-deployment)** | VPS, Local, or On-Premise Server | Beginner (No code) | ~3 mins |
| **[2. Cloud Hosting (Vercel/Render)](#-method-2-cloud-deployment-vercel--mongodb-atlas)** | Free public website hosting | Beginner | ~5 mins |
| **[3. Standard Node.js](#-method-3-manual-local-development)** | Local testing & developers | Intermediate | ~3 mins |

---

## 🐳 Method 1: Docker (One-Click Deployment)

The fastest and most reliable way to run the complete stack (Frontend, Backend, and Database) without installing programming tools.

### Step 1: Install Docker
- Download and install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows / macOS / Linux).
- Start Docker Desktop and ensure it is running.

### Step 2: Download the Project
Open your terminal (PowerShell, Command Prompt, or macOS Terminal) and run:
```bash
git clone https://github.com/AsadBulediReal/New-CMD-App.git
cd New-CMD-App
```

### Step 3: Start the Application
Run this single command:
```bash
docker-compose up -d --build
```

### Step 4: Open in Your Browser
- **Portal Interface**: Open [http://localhost](http://localhost) (or port `5173`)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

To stop the portal at any time: `docker-compose down`

---

## ☁️ Method 2: Cloud Deployment (Vercel + MongoDB Atlas)

Deploy a live production instance accessible to your entire university team.

### Step 1: Free MongoDB Database (MongoDB Atlas)
1. Sign up for free at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a user with a username and password.
4. Under **Network Access**, click **Add IP Address** and select **Allow Access from Anywhere (`0.0.0.0/0`)**.
5. Click **Connect** -> **Drivers** -> Copy your `MONGODB_URI` connection string (replace `<password>` with your database password).

### Step 2: Google Sign-In Credentials (Optional but Recommended)
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a Project and navigate to **APIs & Services** -> **Credentials**.
3. Click **Create Credentials** -> **OAuth Client ID** (Web application).
4. Add your domain to **Authorized JavaScript origins** (e.g. `http://localhost:5173` and `https://your-app.vercel.app`).
5. Copy your **Client ID**.

### Step 3: Deploy to Vercel
1. Push this repository to your GitHub account.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the **Root Directory** to `frontend` (or root for full-stack Vercel serverless).
4. Add the following **Environment Variables**:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `MONGODB_URI` | Your MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/cmd` |
| `JWT_SECRET` | Secret key for signing login tokens | `64-character random hex string` |
| `ADMIN_EMAIL` | Super admin email (auto-activated) | `admin@usindh.edu.pk` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxxx.apps.googleusercontent.com` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID (Frontend) | `xxxx.apps.googleusercontent.com` |
| `VITE_API_URL` | Live Backend URL (if separate) | `https://api.yourdomain.com` |

> [!TIP]
> **Generate a secure `JWT_SECRET`:** Run this command in your terminal to generate one instantly:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

5. Click **Deploy**. Your app is live!

---

## 💻 Method 3: Manual Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or higher)
- [Git](https://git-scm.com/)

### Step-by-Step Setup
```bash
# 1. Clone repository
git clone https://github.com/AsadBulediReal/New-CMD-App.git
cd New-CMD-App

# 2. Setup Server Environment
cd server
npm install
# Create a .env file (copy from .env.example) and fill in your MONGODB_URI and JWT_SECRET
npm run dev

# 3. Setup Frontend (in a separate terminal)
cd ../frontend
npm install
# Create a .env file (copy from .env.example)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Initial Administrator Setup & User Approvals

1. **First User Bootstrap**: The very first user account registered (or any user registering with the configured `ADMIN_EMAIL`) is **automatically activated as Super Administrator**.
2. **Staff Registrations**: Subsequent staff registrations (via Email or Google) will be placed in a secure **Pending Approval** state.
3. **Approving Staff**:
   - Log into the portal as Administrator.
   - Click **Admin Hub** in the header navigation.
   - Navigate to **User Approvals** to approve or reject pending staff accounts with optional rejection notes.

---

## 📧 Email Notifications Setup (Gmail SMTP)

To enable registration alerts and password recovery emails:
1. Go to your [Google Account Security](https://myaccount.google.com/security).
2. Enable **2-Step Verification**.
3. Search for **App Passwords**, generate a new 16-character App Password for "CMD App".
4. Add these variables to your server `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx
   EMAIL_FROM="CMD Portal <no-reply@usindh.edu.pk>"
   ```

---

## 📚 Technical Documentation

Detailed architecture specifications and API documentation:
- [System Architecture & Stack](docs/01-architecture-and-stack.md)
- [Module Specifications](docs/02-modules-specification.md)
- [Database & Storage Architecture](docs/03-database-and-storage.md)
- [API Reference](docs/04-api-reference.md)
- [Auth, RBAC, Audit & Deletions](docs/07-auth-rbac-and-audit-specification.md)
- [Changelog & Guidelines](docs/06-changelog-and-ai-guidelines.md)

---

*Developed for the Cash Management Division (CMD), University of Sindh.*
