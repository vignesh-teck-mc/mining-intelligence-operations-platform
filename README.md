# Mining Intelligence Operations Platform

### Intelligent Mining Equipment Stoppage Analysis and Operational Decision Support

**Think Ahead. Better Runtime.**

A full-stack mining operations analytics platform designed to analyze equipment stoppages, monitor downtime, visualize operational performance, and provide AI-assisted insights from mining equipment data.

Built using React, Java Spring Boot, Python FastAPI, and MySQL, the platform brings equipment records, operational analytics, and AI-assisted data exploration into one application.

---

## Overview

Mining operations depend on the availability and reliability of heavy equipment. Unexpected stoppages can affect productivity, increase operational costs, and disrupt production schedules.

The Mining Intelligence Operations Platform provides a centralized application for analyzing equipment stoppage records, exploring downtime patterns, visualizing operational metrics, and querying mining data through an AI-assisted interface.

The project demonstrates the integration of frontend development, backend services, database management, data processing, and AI service integration in a modular software architecture.

## Key Features

### 📊 Operational Dashboard

* Overview of equipment stoppage records.
* Total downtime and average downtime indicators.
* Equipment and location summaries.
* Interactive charts for exploring stoppage patterns.
* Data-driven operational insights.

### ⚙️ Equipment & Records

* View equipment stoppage records.
* Explore equipment-specific information.
* Analyze stoppages by equipment and category.
* Investigate recurring equipment issues.

### 📈 Analytics & Insights

* Equipment-wise downtime analysis.
* Stoppage reason analysis.
* Location-based operational comparisons.
* Identification of equipment with frequent or prolonged stoppages.
* Visual representation of operational trends.

### 🤖 MINE AI

* Conversational interface for mining data questions.
* AI-assisted interpretation of stoppage information.
* Natural-language queries about equipment and downtime.
* Integration with a Python-based AI service.

*AI functionality depends on the configured service and available model infrastructure.*

### 📂 Data Management

* Import equipment stoppage data from Excel workbooks.
* Process records through the backend.
* Detect duplicate records where supported by the import logic.
* Support data-driven dashboard updates.

### 📥 Data Export

* Download operational records for reporting.
* Support filtered exports where implemented.
* Enable further analysis using spreadsheet applications.

---

## Technology Stack

| Component         | Technology                |
| ----------------- | ------------------------- |
| Frontend          | React                     |
| Build Tool        | Vite                      |
| Styling           | CSS                       |
| Primary Backend   | Java, Spring Boot         |
| AI Backend        | Python, FastAPI           |
| Database          | MySQL                     |
| Data Import       | Excel workbook processing |
| API Communication | HTTP / REST               |
| Version Control   | Git and GitHub            |

---

## System Architecture

```text
                       USER
                         |
                         v
              +----------------------+
              |   React + Vite UI    |
              | Dashboard, Analytics |
              | Equipment, MINE AI   |
              +----------------------+
                         |
                    HTTP / REST
                         |
               +---------+---------+
               |                   |
               v                   v
      +------------------+  +------------------+
      | Java Spring Boot |  | Python FastAPI   |
      | Backend Service  |  | AI Service       |
      +------------------+  +------------------+
               |
               v
      +------------------+
      |  MySQL Database  |
      | Stoppage Records |
      +------------------+
```

### Architecture Components

* **React + Vite:** Provides the interactive user interface and dashboard.
* **Java Spring Boot:** Handles configured backend operations and database interactions.
* **Python FastAPI:** Exposes the AI-related application endpoints.
* **MySQL:** Stores structured equipment stoppage information.

The services communicate through configured API endpoints. Cloud deployment requires suitable database connectivity, environment variables, and cross-origin configuration.

---

## Project Structure

```text
mining-intelligence-operations-platform/
|
|-- frontend/
|   |-- src/
|   |-- public/
|   |-- package.json
|   `-- vite.config.js
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

*This is a high-level overview of the project structure. Actual files may vary as development progresses.*

---

## Getting Started

### Prerequisites

Install the following tools:

* Node.js and npm
* Java Development Kit compatible with the project
* Python 3
* MySQL Server
* Git

An AI model runtime is additionally required if the selected AI functionality depends on a locally hosted model.

### 1. Clone the Repository

```bash
git clone https://github.com/vignesh-teck-mc/mining-intelligence-operations-platform.git
cd mining-intelligence-operations-platform
```

### 2. Configure MySQL

Create the application database:

```sql
CREATE DATABASE mines_equipment_stoppage;
```

Configure the database connection and ensure the required tables and schema are available.

**Security:** Never commit database passwords, API keys, or production credentials. Use environment variables or a secrets manager.

### 3. Start the Java Backend

Open a terminal in the Java backend directory:

```powershell
cd Mines-Equipment-Stoppage-Analysis
.\mvnw.cmd spring-boot:run
```

The default application port is `8080`, unless overridden by configuration.

### 4. Start the Python AI Service

Open another terminal:

```powershell
cd python-ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Start the FastAPI application:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

This command assumes the FastAPI application instance is named `app` in `main.py`.

### 5. Start the Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The development interface is normally available at:

`http://localhost:5173`

Ensure the frontend API configuration points to the correct Java and Python service addresses.

### 6. Build the Frontend

```bash
npm run build
```

Vite generates production-ready static assets in the `dist` directory.

---

## Environment Configuration

The frontend supports the following API configuration variables:

| Variable               | Purpose                       |
| ---------------------- | ----------------------------- |
| `VITE_API_URL`         | Python AI service base URL    |
| `VITE_RECORDS_API_URL` | Java stoppage records API URL |
| `VITE_UPLOAD_API_URL`  | Java Excel upload endpoint    |
| `VITE_JAVA_API_URL`    | Java backend base URL         |

Configure these variables for the target environment.

**Important:** Vite exposes `VITE_*` values in the client bundle. Never store passwords, private API keys, or other secrets in frontend environment variables.

The Java backend supports environment-based configuration for:

* `DB_URL`
* `DB_USERNAME`
* `DB_PASSWORD`
* `PORT`

Supply the actual connection details through your local environment or cloud hosting configuration.

---

## Security Considerations

* Keep credentials outside the source code.
* Exclude `.env` files and local configuration backups from version control.
* Restrict database access to authorized services.
* Configure production CORS origins explicitly.
* Use HTTPS for public endpoints.
* Validate uploaded files and API requests.
* Avoid exposing sensitive data in application logs.
* Keep dependencies and runtime environments updated.

A public repository makes source code visible; it should not expose production credentials or unrestricted database access.

---

## Development Status

The project is under active development.

The React frontend has successfully completed a local Vite production build. The Java backend, Python AI service, and MySQL database are separate components that require appropriate configuration to operate together.

Cloud deployment, production database connectivity, and live end-to-end functionality must be verified in the target environment.

---

## Future Enhancements

Potential areas for future development include:

* Predictive maintenance and equipment health monitoring.
* Advanced downtime trend analysis.
* Improved AI-assisted operational recommendations.
* Role-based access control and audit logging.
* Automated deployment and continuous integration.
* Enhanced data validation and reporting.
* Application monitoring and service health checks.

These are potential enhancements, not claims of already implemented functionality.

---

## Project Objective

The objective is to demonstrate how full-stack development, structured operational data, interactive analytics, and AI-assisted interfaces can be integrated into a unified mining intelligence application.

The platform aims to make equipment stoppage information easier to explore, interpret, and use for operational decision support.

---

## Author

**Vignesh V**

B.Tech — Information Technology

**Technical Interests:** Java Development | Full-Stack Development | Backend Engineering | Cloud Technologies | Artificial Intelligence

**GitHub:** [vignesh-teck-mc](https://github.com/vignesh-teck-mc)

---

## License

No license has been assigned yet.

A license can be added after deciding how the project may be used, modified, and redistributed by others.

---

**Mining Intelligence Operations Platform**

*Think Ahead. Better Runtime.*
