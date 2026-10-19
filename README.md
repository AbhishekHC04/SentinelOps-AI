# SentinelOps AI

**A defensive security research workspace for investigating IP addresses and domains.**

SentinelOps AI brings together threat-intelligence lookups, domain/IP registration information, research notes, and investigation history in one web interface.

## Features

- **Research dashboard** for security investigation workflows.
- **RDAP lookups** to retrieve registration information for supported domains and IP addresses.
- **VirusTotal integration** to retrieve available threat-intelligence results.
- **Research notes** backed by MySQL, allowing findings to be saved and revisited.
- **Investigation history** with search, pagination, and the ability to investigate a previously saved target.
- **React frontend** with a dedicated research interface.
- **Spring Boot backend** exposing REST API endpoints.

> Threat-intelligence results are indicators, not proof that a target is safe or malicious. Use this project only for authorized, defensive security research.

## Technology Stack

- Frontend: React, Vite, JavaScript, CSS
- Backend: Java, Spring Boot, Spring Data JPA
- Database: MySQL
- Testing: JUnit 6 and Spring Boot Test
- External services: RDAP and VirusTotal

## Project Structure

```text
SentinelOps-AI/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   ├── test/
│   │   └── resources/
│   ├── pom.xml
│   ├── mvnw
│   └── mvnw.cmd
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the project:

- Java 21
- Node.js and npm
- Docker Desktop or a local MySQL server
- A VirusTotal API key for VirusTotal lookups

## Configuration

Configure the backend database using environment variables. Do not commit credentials, API keys, or local configuration files.

The default database configuration expects a local MySQL database named `sentinelops`, with the username `root`. Override these defaults if your local setup differs.

In PowerShell, set the database environment variables for the current terminal:

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/sentinelops"
$env:DB_USERNAME = "your_mysql_username"
$env:DB_PASSWORD = "your_mysql_password"
$env:VIRUSTOTAL_API_KEY = "your_virustotal_api_key"
```

Replace the example values with your own local configuration. Never publish real credentials.

## Running the Application

### 1. Start MySQL

Start your local MySQL service or the Docker container you configured for the `sentinelops` database.

### 2. Start the backend

From the repository root, open a PowerShell terminal:

```powershell
Set-Location ".\backend"
$env:SERVER_PORT = "8082"
.\mvnw.cmd spring-boot:run
```

Ensure the database environment variables and VirusTotal API key are configured in this same terminal.

### 3. Start the frontend

Open a separate PowerShell terminal:

```powershell
Set-Location ".\frontend"
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

The research page is available at:

`http://localhost:5173/research.html`

Keep both terminal sessions running while using the application.

## API Endpoints

The backend provides the following research endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/research/lookup?target=...` | RDAP registration lookup |
| GET | `/api/research/virustotal?target=...` | VirusTotal threat-intelligence lookup |
| GET | `/api/research/notes?target=...` | Retrieve research notes for a target |
| POST | `/api/research/notes` | Save a research note |
| GET | `/api/research/history?search=&page=0&size=10` | Search and paginate investigation history |

Use properly URL-encoded targets in query parameters. The notes endpoint expects a request body defined by the backend implementation.

## Testing and Production Build

### Backend tests

```powershell
Set-Location ".\backend"
.\mvnw.cmd test
```

The tests use a separate in-memory H2 database so the test context does not depend on your personal MySQL credentials.

### Frontend production build

```powershell
Set-Location ".\frontend"
npm run build
```

The generated frontend build output is stored in `frontend/dist/` and is excluded from Git.

## Security Notes

- Never commit `.env` files, passwords, API keys, database backups, or private certificates.
- Use environment variables or an appropriate secrets manager for credentials.
- Treat third-party threat-intelligence responses as investigative evidence, not definitive verdicts.
- Use only systems, domains, and IP addresses you are authorized to investigate.

## Current Scope

SentinelOps AI currently combines a web dashboard, research tools, external threat-intelligence lookups, persistent research notes, and investigation history. Additional automation, analytics, and integrations should be documented as they are implemented and tested.

## License

No license has been added yet. Add a license file before explicitly granting others permission to reuse or redistribute this project.
