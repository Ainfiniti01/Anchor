# ⚓ Anchor — Behavioral MemoryAgent

**A Private, Memory-Powered Accountability Companion built with Alibaba Cloud Qwen.**

> *"Anchor doesn't simply remember conversations, it remembers meaningful progress."*
> *"Anchor communicates with Alibaba Cloud Qwen models through the DashScope Workspace OpenAI-compatible API."*

![Anchor Logo](assets/images/createimg-ai.png)

---

## 🌍 Global AI Hackathon — Track 1: MemoryAgent

Anchor is a privacy-first AI accountability companion that combines persistent memory, behavioral learning, and adaptive support to help people build healthier habits over time. Unlike conventional habit trackers, Anchor distinguishes between wellness check-ins, urges, resisted urges, and relapses to provide more meaningful insights.

---

### Autonomous Memory Lifecycle

Anchor continuously:

- Stores meaningful user experiences
- Retrieves only relevant memories
- Reinforces confirmed memories
- Gradually forgets outdated information through memory decay

This enables long-term personalized support while maintaining an efficient context window.

---
## 🧠 Memory Engine

Every conversation follows a complete memory lifecycle:

• Retrieve relevant memories
• Reason with Alibaba Cloud Qwen
• Reinforce confirmed memories
• Store new experiences
• Decay outdated memories

This allows Anchor to continuously learn while keeping its context focused and efficient.

---

## 📱 Application Interface

### 🏠 Home Dashboard & 💬 AI Chat Companion
| Home Dashboard | AI Chat Companion |
| :---: | :---: |
| ![Home Page](assets/images/home.png) | ![Chat Page](assets/images/chat.png) |

### 📈 Progress Analytics & ⚙️ Privacy Settings
| Progress Analytics | Privacy Settings |
| :---: | :---: |
| ![Progress Page](assets/images/progress.png) | ![Settings Page](assets/images/settings.png) |

---

## 🎥 Demo

Live Demo:
https://dev-sphere-kappa.vercel.app/

Demo Video:
(Coming Soon)

---

## ✨ Core Features

- 🧠 **Persistent Behavioral Memory:** Remembers goals, triggers, and identity statements across sessions.
- ⚓ **Redefined Urge Logging:** Distinguishes between wellness check-ins ("No urge") and actual urge events (Intensity 1-5).
- 🤖 **Qwen-Ai Intelligence:** Powered by Alibaba Cloud’s high-performance models via the DashScope API.
- 📈 **Segregated Metrics:** Separate tracking for Days Checked In, Urges Experienced, Urges Resisted, and Relapses.
- 🔒 **Security-First Design:** Features an inactivity-based PIN Lock and strict Row-Level Security (RLS).
- 🔔 **Discreet Support:** Custom notification chimes and personalized companion styles (Supportive, Neutral, or Coaching).
- 🧩 Personalized AI Companion: Adapts its tone (Supportive, Neutral, or Accountability Coach) based on user preferences.

---

## 🏗️ Technical Architecture

Anchor uses a **Tri-Stage Intelligence Loop**:

```
User Action (Wellness / Urge Log)
     │
     ▼
PostgreSQL Database (Row-Level Security)
     │
     ▼
Supabase Edge Functions (Qwen-Max Reasoning)
     │
     ▼
Memory Update & Risk Evaluation
     │
     ▼
Live Dashboard & Chat Synthesis
```

1. **Log Collection:** User logs wellness or urges via a redefined logic gate.
2. **Behavioral Reasoning:** Supabase Edge Functions (Qwen-Ai) analyze the logs, factoring in intensity, frequency, and time of day.
3. **State Synthesis:** The AI updates the user's `recovery_score` and `risk_level`, providing a fresh "Weekly Insight" and "Recommended Action" on the dashboard.

---

## 🧠 How Anchor Implements MemoryAgent

Anchor satisfies the MemoryAgent requirements through four core capabilities:

### Persistent Memory
The AI remembers goals, triggers, and achievements. These are stored in `user_memories` with importance scores.

### Intelligent Retrieval
Anchor retrieves only the most relevant memories for chat context using a custom RAG-style prioritization engine.

### Memory Reinforcement & Decay
Memories strengthen when confirmed by the user and gradually decay if they are no longer relevant to the user's current behavioral patterns.

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Database/Auth:** Supabase (PostgreSQL + RLS)
- **AI Engine:** Alibaba Cloud Qwen-Ai (DashScope Workspace Endpoint)
- **Deployment:** Vercel
- **Backend:** Supabase Edge Functions

---
## ☁️ Alibaba Cloud Integration

Anchor communicates with Alibaba Cloud Qwen through the official DashScope Workspace OpenAI-compatible endpoint:

https://ws-12c4bsjrjqxy8v2b.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions

The application performs AI reasoning using Alibaba Cloud Qwen models via Supabase Edge Functions.

---

## 🚀 Getting Started

1. Set up your Supabase project.
2. Configure the `QWEN_API_KEY` in your Supabase Edge Function secrets.
3. Use the integrated SQL tools to set up the `profiles`, `user_memories`, and `urge_logs` schema.

```
Clone repository
     │
     ▼
Install dependencies
     │
     ▼
Configure Supabase
     │
     ▼
Set QWEN_API_KEY
     │
     ▼
Deploy Edge Functions
     │
     ▼
Run npm install
     │
     ▼
Run npm run dev
```

---

## 🔒 Security
- **Inactivity PIN Lock:** Automatically secures the app after a customizable period of idle time.
- **Privacy Mode:** Notification text is kept discreet to protect user privacy in public spaces.

---

## 📄 License

MIT License

Built for the Global AI Hackathon 2026.