# Revcode AI

Revcode AI is an intelligent code review and security auditing platform that leverages modern AI models to help developers identify vulnerabilities, improve code quality, and automate remediation.

## Features

- **Automated AI Code Review:** Analyzes your code using Gemini 2.0 Flash to detect security vulnerabilities (Injection, hardcoded secrets, etc.), identify code smells, and suggest improvements.
- **Autonomous Code Correction (The Fixer + The Architect):** Automatically generates secure fixes for identified issues while maintaining original code structure. Includes a self-verification step to prevent syntax errors or obvious bugs.
- **Cloud Security Scanner:** Deeply scans Infrastructure-as-Code (IaC) files (`Dockerfile`, `docker-compose.yml`, Kubernetes manifests, Terraform scripts, GitHub Actions workflows) to detect IAM risks, exposed secrets, and network vulnerabilities.
- **GitHub Integration:** Connect your GitHub account via OAuth to seamlessly fetch your repositories, open pull requests, and review code directly from your codebase.
- **Human-in-the-Loop Feedback:** Provides a mechanism to store feedback on AI-corrected code for continuous active learning and model retraining.
- **Dashboard & Analytics:** View your security score, track vulnerabilities across repositories, and monitor recent review and scan activities.

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Icons:** Lucide React
- **Styling:** Custom CSS with a responsive design and modern UI components

### Backend
- **Server:** Node.js with Express
- **Authentication:** JWT, bcryptjs, GitHub OAuth
- **AI Integration:** `@google/genai` (Gemini 2.0 Flash), with fallback support for local heuristic analysis and custom ML services (`ML_SERVICE_URL`).
- **Database:** In-memory JSON-based storage (`data.json`) for quick prototyping and demo purposes.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Google Gemini API Key
- A GitHub OAuth App (for GitHub integration)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Revcode
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   ```

4. **Environment Variables:**
   Create a `.env` file in the `server` directory and add the following:
   ```env
   PORT=3001
   JWT_SECRET=your_jwt_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
   ML_SERVICE_URL=optional_custom_ml_service_url
   ```

### Running the Application

1. **Start the Backend Server:**
   ```bash
   cd server
   npm run start
   ```
   *Note: If `npm run start` is not defined in `package.json`, you can run `node index.js`.*

2. **Start the Frontend Development Server:**
   Open a new terminal window:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

## Architecture Overview

- **Auth Layer:** Handles local login and GitHub OAuth. Issues JWTs for authenticated sessions.
- **Review Engine:** Receives code snippets, routes them to Gemini for deep analysis, and falls back to a heuristic engine or a dedicated ML service if needed.
- **Autofix Pipeline:** Uses a two-step AI process to first generate a minimal, secure fix, and then verify its correctness before returning the suggestion.
- **Cloud Scanner:** Connects to the GitHub API to read IaC files and evaluates them for cloud security misconfigurations.
