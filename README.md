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

---

## 🐞 Bug Report Configuration

The application includes a bug reporting feature that sends emails via SMTP. To enable this, configure the following environment variables.

### Local Setup
If running the server directly, add these to `server/.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP Server address | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP Port | `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | Email address used to send reports | `reports@example.com` |
| `SMTP_PASS` | App password for the SMTP user | `your-app-password` |
| `REPORT_RECIPIENT` | Email address where bug reports are sent | `bulediasadjamil@gmail.com` |

### Docker Setup
When using Docker Compose, you can add these variables to the `environment` section of the `server` service in `docker-compose.yml`:

```yaml
  server:
    ...
    environment:
      - MONGODB_URI=mongodb://db:27017/cmd_app
      - PORT=5000
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=your-email@gmail.com
      - SMTP_PASS=your-app-password
      - REPORT_RECIPIENT=bulediasadjamil@gmail.com
```

> [!TIP]
> If using Gmail, you must generate an **App Password** from your Google Account settings to use as the `SMTP_PASS`.
