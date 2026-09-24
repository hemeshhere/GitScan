# 🛡️ GitScan

> **Real-Time Automated Secret Detection & CI/CD DevSecOps Engine**  
> *A high-velocity, AST-powered security platform protecting developers and organizations from credential leaks.*

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Tree--Sitter](https://img.shields.io/badge/Parser-Tree--Sitter%20AST-orange)](https://tree-sitter.github.io/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

---

## 📄 Official Documentation & Specifications

The complete, exhaustive **Software Requirements Specification (SRS)** prepared for hackathon submission and architectural review is available in:

👉 **[Read the Full Software Requirements Specification (SRS.md)](./SRS.md)**

The SRS covers:
- Complete System Architecture & Sequence Diagrams (Mermaid)
- Functional Requirements (Modules 1 through 10)
- Non-Functional Requirements (Latency, Security, Cryptography)
- Database Schemas (`Scan`, `Leak`) & Zod Runtime Schemas
- REST API Documentation (`/api/stats`, `/api/scans`, `/api/scan-repo`, `/api/webhooks/github`)
- Tree-Sitter AST vs Regex Benchmark & Rule Catalog
- Complete Hackathon Judging Demo Script

---

## 🌟 Why GitScan?

Hardcoded credentials (API keys, private keys, database connection strings) are the leading cause of initial access vectors in cloud breaches (**CWE-798**). Bots scrape public commits in under 90 seconds.

**GitScan** stops credential leakage before and after it reaches production:

1. **Three-Tier Detection Defense:**
   - **Tier 1 — Banned File Quarantine:** Instantly catches committed `.env`, `.pem`, and `.key` files.
   - **Tier 2 — Tree-Sitter AST Analysis:** Parses JavaScript & TypeScript into an Abstract Syntax Tree to analyze **only string literals**, discarding comments and mock variables to eliminate false positives.
   - **Tier 3 — High-Speed Regex Fallback:** Comprehensive pattern scanning for Python, YAML, Shell, JSON, and more.
2. **Instant Multi-Channel Alerting:**
   - **Slack Webhook Alerts:** Formatted Block Kit cards with repo, author, commit link, and masked secret.
   - **Automated GitHub Commit Comments:** Automated security bot warnings posted directly on the offending commit.
3. **Deep Historical Repo Scanning:**
   - Audits existing repositories by recursively crawling the entire Git Tree and the last 10 commits.
4. **Developer-First Web Console:**
   - Built with React 18, Vite, and TailwindCSS in a sleek Dark Cyberpunk / Enterprise Security design system. Includes live telemetry, an interactive regex playground, findings management, and pre-commit hook scripts.

---

## 🏗️ System Architecture

```
                       +-----------------------+
                       | Developer Workstation |
                       | (pre-commit hook CLI) |
                       +-----------+-----------+
                                   |
                                   v
                       +-----------------------+
                       |   GitHub Repository   |
                       | (Webhook push events) |
                       +-----------+-----------+
                                   |
          POST /api/webhooks/github (HMAC-SHA256 Signed)
                                   v
+--------------------------------------------------------------------+
|                       GitScan Backend Engine                       |
|                                                                    |
|  - verifyGithubSignature (crypto.timingSafeEqual HMAC validation)   |
|  - Octokit REST Client (Diff & Recursive Tree Fetching)            |
|  - Three-Tier Scanner (Tree-Sitter AST + Banned Files + Regex)     |
|  - Mongoose Persistence (MongoDB Document Store)                   |
|  - Slack Incident Dispatcher & GitHub Bot Commenter                |
+-------------------+----------------------------+-------------------+
                    |                            |
       Incident Card (Slack)          Bot Comment (GitHub)
                    v                            v
          [ Slack #security ]            [ Commit Discussion ]
                    ^
                    |
+-------------------+------------------------------------------------+
|                        GitScan Frontend SPA                        |
|                                                                    |
|  - Overview Dashboard (Live telemetry counters, 6s auto-polling)   |
|  - Historical Deep Repo Scan (Tree crawler & commit analyzer)      |
|  - Findings Explorer (Filter by severity/status, masked reveal)    |
|  - Interactive In-Browser Regex Playground (<10ms live match)      |
|  - Pre-commit Hook & GitHub Actions Workflow Generators           |
+--------------------------------------------------------------------+
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or v20+)
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI
- (Optional) GitHub Personal Access Token & Slack Webhook URL for live alerts

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/gitscan
GITHUB_PAT=ghp_yourGitHubPersonalAccessToken
GITHUB_WEBHOOK_SECRET=yourWebhookSecretSharedWithGithub
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

Start the backend daemon:
```bash
npm run dev
```
*The Scanner Engine will boot up on port 8000 and connect to MongoDB.*

---

### 2. Frontend Setup

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*The Vite development server will open at `http://localhost:5173`.*

---

## 📋 Core Modules & Pages

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | **Landing Page** | Product overview, feature pillars, copyable install commands, live terminal demo, and instant public repo scanner. |
| `/app` | **Overview Dashboard** | Real-time scan telemetry, auto-refreshing activity feed, historical repo scanning form, and scan detail modals. |
| `/app/findings` | **Findings Explorer** | Triage detected leaks, filter by severity / status / repo, view highlighted code snippets, and securely reveal secrets. |
| `/app/repos` | **Repositories** | Monitored repository inventory, risk scoring, hook installation drawers, and cURL command generators. |
| `/app/rules` | **Rule Engine** | Catalog of active rules grouped by provider (AWS, GitHub, Slack, Stripe, Filesystem) with toggle switches. |
| `/app/playground`| **Live Playground** | In-browser split-pane code editor with sub-10ms pattern detection, line/column tracking, and visual highlighting. |
| `/app/integrations`| **Integrations** | Copy-pasteable configurations for pre-commit bash hooks, pre-push hooks, and GitHub Actions CI workflows. |
| `/app/settings` | **Settings** | Workspace customization, default branch configuration, ignored paths, and inline ignore comments. |

---

## 🔍 Supported Secret Signatures

| Rule ID | Provider | Severity | Description |
| :--- | :--- | :--- | :--- |
| `BANNED_FILE_TYPE` | Filesystem | `CRITICAL` | Blocks `.env`, `.pem`, and `.key` files across Git trees and diffs |
| `AWS_ACCESS_KEY` | AWS | `CRITICAL` | Detects AWS Access Key IDs (`AKIA[0-9A-Z]{16}`) |
| `GITHUB_PAT` | GitHub | `CRITICAL` | Detects GitHub Personal Access Tokens (`ghp_[a-zA-Z0-9]{36}`) |
| `SLACK_BOT_TOKEN` | Slack | `HIGH` | Detects Slack Bot Tokens (`xoxb-...`) |
| `STRIPE_SECRET_KEY` | Stripe | `HIGH` | Detects Stripe Live/Test Secret Keys (`sk_live_...`, `sk_test_...`) |
| `GOOGLE_API_KEY` | Google Cloud | `CRITICAL` | Detects Google API and Gemini tokens (`AIza...`) |
| `PRIVATE_KEY_HEADER`| Cryptography | `HIGH` | Detects RSA/EC/PGP/OpenSSH private key headers |
| `DB_CONN_STRING` | Generic | `MEDIUM` | Detects exposed MongoDB, Postgres, MySQL, and Redis URLs |

---

## 🎯 Hackathon Presentation Highlights

When demonstrating GitScan to judges:
1. **Show the AST advantage:** Open `/app/playground`, type a fake key inside a JavaScript string vs inside a comment. Highlight that AST prevents false positives!
2. **Execute a Deep Historical Scan:** Go to `/app`, input a repository (e.g. `octocat/Hello-World`), and run "Initiate Deep Scan" to show how GitScan traverses the entire tree for `.env` files and scans commit history.
3. **Show multi-channel alerts:** Point out the Slack Block Kit card and the automated GitHub commit comment generated by the bot.
4. **Demonstrate pre-commit integration:** Show the Bash script that developers can drop into `.git/hooks/pre-commit` to prevent leaks before `git push`.

---

## 📜 License
This project is licensed under the ISC License.
