# METRIX

<p align="center">
  <img src="docs/images/dashboard-overview.png" alt="METRIX Dashboard Overview" width="100%" style="border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);" />
</p>

<p align="center">
  <strong>A strict, quantitative, point-based goal execution and accountability platform evaluated by AI.</strong><br>
  Replace casual to-do lists with rigorous milestone decomposition, daily focus tracking, and unflattering progress audits.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Next.js-16%20(Turbopack)-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/RTL-Native%20Arabic%20First-teal" alt="RTL Native" />
  <img src="https://img.shields.io/badge/Capacitor-Android%20Ready-119EFF?logo=capacitor" alt="Capacitor" />
</p>

---

## 📸 Interface Showcase

### 1. Goal Deconstruction & Daily Focus
Break ambitious multi-month goals into strict hierarchical daily milestones with weighted point values and hard daily caps.

<p align="center">
  <img src="docs/images/goal-dashboard.png" alt="Goal Dashboard & Task Hierarchy" width="100%" style="border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);" />
</p>

### 2. Trajectory Analytics & 1v1 Duels
Track cumulative productivity over 7, 30, and 90-day intervals, or challenge partners to 1v1 execution duels via invite codes.

<p align="center">
  <img src="docs/images/analytics-trajectory.png" alt="Growth Trajectory" width="49%" style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);" />
  <img src="docs/images/challenge-duel.png" alt="1v1 Challenge Duels" width="49%" style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);" />
</p>

### 3. Gamification, Badges & Mobile Experience
Earn system ranks based on verified output, maintain streaks with built-in freeze protections, and access the entire system seamlessly on mobile devices.

<p align="center">
  <img src="docs/images/profile-achievements.png" alt="Profile Achievements & Badges" width="60%" style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);" />
  <img src="docs/images/mobile-home.png" alt="Mobile Experience" width="38%" style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);" />
</p>

---

## ⚡ Core Highlights

- 🎯 **AI & Manual Goal Decomposition:** Convert any ambitious target into actionable subtasks with defined criteria using Google Gemini or manual structured entry.
- ⚖️ **Objective AI Evaluator:** Audio or text check-ins are scored without flattering. Full points require verifiable deliverables; passive effort receives zero.
- 📈 **Quantitative Caps & Streaks:** Enforces mathematical daily caps to prevent fake progress and burnouts, with automatic streak freeze mechanics.
- ⚔️ **Competitive Duels:** Challenge friends or peers to head-to-head accountability competitions with synced goal targets.
- 🌐 **RTL-Native Bilingual Architecture:** Seamless Arabic-first and English bilingual experience built with modern CSS logical properties.
- 📱 **Unified Web & Mobile:** Single codebase powering both the Next.js web application and Android APK export via Capacitor.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4, Lucide Icons |
| **Backend & Database** | Supabase (PostgreSQL with RLS), Google OAuth, Edge Functions |
| **AI Intelligence** | Google Gemini 2.5 (Goal Generation & Evaluation), Mistral (Voice Transcription) |
| **Media & Mobile** | ImageKit (Milestone Media), Capacitor (Android Native Export) |

---

## 🚀 Quickstart

### 1. Clone & Install

```bash
git clone https://github.com/muntarazr/metrix.git
cd metrix
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and add your project credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `MISTRAL_API_KEY`

### 3. Setup Database

Run the consolidated schema in your Supabase SQL Editor:
- [`supabase/setup.sql`](supabase/setup.sql)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

```bash
# Run unit & logic test suites (89 passing tests)
npm test

# Type-check TypeScript codebase
npx tsc --noEmit

# Production build test
npm run build
```

---

## 🤖 Agent Skill Integration

METRIX is also packaged as an installable **AI Agent Skill** (`metrix-goal-engine`), allowing agents (Claude Code, Gemini CLI, Antigravity) to decompose goals and evaluate daily check-ins directly in your terminal:

```bash
npx skills add ./skills/metrix-goal-engine
```

Learn more in [skills/metrix-goal-engine/SKILL.md](skills/metrix-goal-engine/SKILL.md).

---

## 🤝 Contributing & Security

- **Contributing:** Please read [CONTRIBUTING.md](CONTRIBUTING.md) for code standards and PR submission guidelines.
- **Security:** To report security concerns responsibly, see [SECURITY.md](SECURITY.md).
- **Roadmap:** Detailed implementation notes are in [docs/OPEN_SOURCE_PLAN.md](docs/OPEN_SOURCE_PLAN.md).

## 📄 License

This project is licensed under the [MIT License](LICENSE).
