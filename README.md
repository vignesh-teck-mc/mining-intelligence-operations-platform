# Mining Intelligence Operations Platform

### Intelligent Mining Equipment Stoppage Analysis and Operational Decision Support

**Think Ahead. Better Runtime.**

A full-stack mining operations analytics platform designed to analyze equipment stoppages, monitor downtime, visualize operational performance, and provide AI-assisted insights from mining equipment data.

The platform combines a modern web interface, a Java backend, a Python AI service, and a MySQL database to help users understand equipment performance and identify potential opportunities to improve operational efficiency.

---

## Overview

Mining operations depend on the availability and reliability of heavy equipment. Unexpected stoppages can affect productivity, increase operational costs, and disrupt production schedules.

The **Mining Intelligence Operations Platform** addresses these challenges by centralizing equipment stoppage records, analyzing downtime patterns, presenting interactive dashboards, and providing a conversational interface for querying operational data.

The system is developed as a full-stack software engineering project using modern web technologies and backend frameworks.

## Key Features

### 📊 Operational Dashboard

* Overview of equipment stoppage records.
* Total downtime and average downtime indicators.
* Equipment availability-related operational insights.
* Equipment and location summaries.
* Interactive charts for exploring stoppage patterns.

### ⚙️ Equipment & Records Management

* View equipment stoppage records.
* Analyze stoppages by equipment and category.
* Explore operational records and downtime information.
* Support data-driven investigation of recurring equipment issues.

### 📈 Analytics & Insights

* Equipment-wise downtime analysis.
* Stoppage reason analysis.
* Location-based operational comparisons.
* Identification of equipment with frequent or prolonged stoppages.
* Visual representation of operational trends.

### 🤖 MINE AI

* Conversational interface for mining data questions.
* AI-assisted interpretation of stoppage information.
* Support for natural-language queries about equipment and downtime.
* Integration with a Python-based AI service.

*AI capabilities depend on the configured AI service and available model infrastructure.*

### 📂 Data Management

* Import equipment stoppage data from Excel workbooks.
* Process records through the backend.
* Detect duplicate records where supported by the import logic.
* Support data-driven dashboard updates.

### 📥 Data Export

* Download operational records for reporting and further analysis.
* Support filtered data exports where implemented.
* Enable offline analysis using spreadsheet tools.

---

## Technology Stack

| Component         | Technology                |
| ----------------- | ------------------------- |
| Frontend          | React                     |
| Frontend tooling  | Vite                      |
| UI styling        | CSS                       |
| Primary backend   | Java, Spring Boot         |
| AI backend        | Python, FastAPI           |
| Database          | MySQL                     |
| Data import       | Excel workbook processing |
| API communication | HTTP / REST               |
| Version control   | Git and GitHub            |

---

## System Architecture

The application follows a modular, multi-service architecture.

```text
                  USER
                    |
                    v
          +---------------------+
          |   React + Vite UI   |
          |  Dashboard & MINE AI|
          +---------------------+
                    |
             HTTP / REST APIs
                    |
          +---------+----------+
          |                    |
          v                    v
+-------------------+  +-------------------+
| Java Spring Boot  |  | Python FastAPI    |
| Backend Service   |  | AI Service        |
+-------------------+  +-------------------+
          |
          v
+-------------------+
|    MySQL Database |
| Stoppage Records  |
+-------------------+
```

**Architecture summary**

* **Frontend:** Provides the user interface, dashboard, analytics, record management, and AI interaction.
* **Java backend:** Handles the application's configured backend operations and database interactions.
* **Python AI service:** Provides the AI-related API functionality.
* **MySQL:** Stores structured equipment stoppage records.

The services communicate through configured API endpoints. Deployment requires appropriate database connectivity, environment variables, and cross-origin settings.

---

## Project Structure

```text
mining-intelligence-operations-platform/
|
|-- frontend/
|   |-- src/
|   |-- public/
|   |-- package.json
|   |-- vite.config.js
|   `-- index.html
|
|-- Mines-Equipment-Stoppage-Analysis/
|   |-- src/
|   |-- pom.xml
|   |-- mvnw
|   `-- mvnw.cmd
|
|-- python-ai/
|   |-- main.py
|   |-- requirements.txt
|   `-- mining_equipment_stoppage_dataset-1.xlsx
|
|-- .gitignore
`-- README.md
```

*The structure above describes the principal project components; individual files may vary as development progresses.*

---

## Getting Started

### Prerequisites

Install the following software before running the application:

* Node.js and npm
* Java Development Kit (JDK) compatible with the Maven project
* Python 3
* MySQL Server
* Git

An AI model runtime is additionally required if the selected AI functionality depends on a locally hosted model.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/mining-intelligence-operations-platform.git
cd mining-intelligence-operations-platform
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Configure MySQL

Create the application database:

```sql
CREATE DATABASE mines_equipment_stoppage;
```

Configure the database connection and ensure the required tables and schema are available.

**Security:** Never commit database passwords, API keys, or production credentials. Supply them through environment variables or an appropriate secrets manager.

### 3. Start the Java Backend

Open a terminal in the Java backend directory:

```bash
cd Mines-Equipment-Stoppage-Analysis
```

On Windows, run:

```powershell
.\mvnw.cmd spring-boot:run
```

The default application port is `8080`, unless overridden by configuration.

### 4. Start the Python AI Service

Open another terminal:

```bash
cd python-ai
```

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI service:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

This command assumes the FastAPI application is exposed as `app` in `main.py`.

### 5. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the development interface at:

```text
http://localhost:5173
```

Ensure that the frontend API configuration points to the correct Java and Python service addresses.

### 6. Build for Production

To create a production frontend build:

```bash
npm run build
```

The generated static files are placed in the `dist` directory.

---

## Configuration

The frontend supports environment-based API configuration.

| Variable               | Purpose                       |
| ---------------------- | ----------------------------- |
| `VITE_API_URL`         | Python AI service base URL    |
| `VITE_RECORDS_API_URL` | Java stoppage records API URL |
| `VITE_UPLOAD_API_URL`  | Java Excel upload endpoint    |
| `VITE_JAVA_API_URL`    | Java backend base URL         |

Configure these values for the target environment. Vite embeds `VITE_*` variables into the client bundle, so **never store secrets in frontend environment variables**.

The Java backend supports environment-based configuration for:

* `DB_URL`
* `DB_USERNAME`
* `DB_PASSWORD`
* `PORT`

Use the actual database connection details provided by your deployment environment.

---

## Security Considerations

Security is an essential part of preparing the application for public deployment.

* Store sensitive credentials outside the source code.
* Exclude `.env` files and local configuration backups from version control.
* Restrict database access to authorized services.
* Configure production CORS origins explicitly.
* Use HTTPS for publicly accessible services.
* Validate uploaded files and incoming API requests.
* Avoid exposing detailed SQL statements or sensitive information in production logs.
* Keep dependencies and runtime environments updated.

Public source-code availability does not mean production services or database access should be public.

---

## Current Development Status

The project is under active development.

The React frontend has successfully completed a Vite production build in the local development environment.

The application consists of separate frontend, Java backend, and Python AI service components. Cloud deployment, production database connectivity, and live end-to-end verification must be validated in their target environment.

Features should be considered production-ready only after the corresponding implementation and tests have been verified.

---

## Future Enhancements

Potential future improvements include:

* Equipment health monitoring and predictive maintenance.
* More advanced downtime trend analysis.
* Improved AI-assisted operational recommendations.
* Role-based access control and audit logging.
* Automated deployment and continuous integration.
* Enhanced data validation and reporting.
* Monitoring, logging, and service health checks.

These items represent potential enhancements rather than claims about existing functionality.

---

## Project Objective

The objective of this project is to demonstrate how full-stack development, structured operational data, interactive analytics, and AI-assisted interfaces can be combined into a unified mining intelligence application.

The platform aims to make equipment stoppage information easier to explore, interpret, and use for operational decision support.



## Author

**Vignesh V**
B.Tech — Information Technology

**Areas of interest:** Java Development | Full-Stack Development | Backend Engineering | Cloud Technologies | Artificial Intelligence



## License

No license has been assigned yet.

Before adding a license, decide how you want others to use, modify, and redistribute the source code.

**Mining Intelligence Operations Platform**
*Think Ahead. Better Runtime.*
