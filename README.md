# Fullstack CMD Application

A robust full-stack application for statement analytics, audit categorization, and bank reconciliation. This project is fully containerized for easy deployment and development.

## 🚀 Quick Start (Docker)

The easiest way to run the application is using Docker and Docker Compose. This will set up the Frontend, Backend, and MongoDB database automatically.

### Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) installed on your machine.
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop).

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
