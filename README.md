# Fullstack CMD Application

A robust full-stack application for statement analytics, audit categorization, and bank reconciliation. This project is fully containerized for easy deployment and development.

## 🚀 Quick Start (Docker)

The easiest way to run the application is using Docker and Docker Compose. This will set up the Frontend, Backend, and MongoDB database automatically.

### 📋 Prerequisites
The following **must** be installed on your machine before setting up the application:

- [Git](https://git-scm.com/downloads) - For cloning and updating the source code.
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) - Docker Desktop includes Docker Compose automatically.

*To check if these are installed, run `git --version`, `docker --version`, and `docker-compose --version` in your terminal.*

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/AsadBulediReal/New-CMD-App.git
   cd New-CMD-App
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   *This command will build the images and start all services.*

3. **Access the Application**
   - **Frontend**: [http://localhost](http://localhost)
   - **Backend API**: [http://localhost:5000](http://localhost:5000)
   - **MongoDB**: Runs internally on port `27017`

---

## 🛠️ Management Commands

### Stop the Application
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Force a Rebuild
If you make changes to the code and want to see them in Docker:
```bash
docker-compose up --build
```

### 🔄 Updating to Latest Version
If you have pushed changes and want to update the application, run these commands from the **project root directory**:

1. **Pull latest source code:**
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart containers:**
   ```bash
   docker-compose up --build -d
   ```

3. **(Optional) Clean up old images:**
   ```bash
   docker image prune -f
   ```

---

## 📂 Project Structure

- `/frontend`: React application (Vite, TypeScript, Tailwind CSS, Shadcn UI).
- `/server`: Node.js Express API.
- `docker-compose.yml`: Orchestration for the entire stack.
- `.github/workflows`: CI/CD pipeline for automated Docker builds.

## 🤖 CI/CD
This project uses **GitHub Actions** to automatically build and push Docker images to the **GitHub Container Registry (GHCR)** whenever code is pushed to the `main` branch.

Images can be pulled from:
- `ghcr.io/asadbuledireal/new-cmd-app-frontend:latest`
- `ghcr.io/asadbuledireal/new-cmd-app-server:latest`

To pull and run these images without the source code, you can use:
```bash
docker pull ghcr.io/asadbuledireal/new-cmd-app-frontend:latest
docker pull ghcr.io/asadbuledireal/new-cmd-app-server:latest
```

---

## 🐞 Bug Report Configuration

The application includes a bug reporting feature that sends emails via SMTP. Follow these steps to set it up:

### Step 1: Obtain SMTP Credentials
If you are using Gmail (recommended), you **cannot** use your regular password. You must use an **App Password**:
1. Go to your [Google Account Settings](https://myaccount.google.com/).
2. Navigate to **Security**.
3. Enable **2-Step Verification** if it isn't already.
4. Search for **App passwords** in the search bar.
5. Create a new app password (e.g., name it "CMD App") and copy the 16-character code.

### Step 2: Configure Environment Variables
You can configure the system for either **Local** or **Docker** setup.

#### Option A: Local Setup
Create or edit `server/.env` and add the following:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # Your 16-character App Password
REPORT_RECIPIENT=bulediasadjamil@gmail.com
```

#### Option B: Docker Setup (Recommended)
Edit the `docker-compose.yml` file in the root directory and update the `server` service environment:
```yaml
  server:
    ...
    environment:
      - MONGODB_URI=mongodb://db:27017/cmd_app
      - PORT=5000
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=your-email@gmail.com
      - SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # Your 16-character App Password
      - REPORT_RECIPIENT=bulediasadjamil@gmail.com
```

### Step 3: Restart the Application
For the changes to take effect, restart the server:

- **Local:** Restart the Node.js process.
- **Docker:** Run `docker-compose up -d` to refresh the container configuration.

> [!IMPORTANT]
> Ensure `SMTP_PORT` is set to `587` for TLS or `465` for SSL. If using Gmail, `587` is the standard.
