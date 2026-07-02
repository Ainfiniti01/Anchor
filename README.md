# ⚓ Anchor — Behavioral MemoryAgent

**A Private, Memory-Powered Accountability Companion built with Alibaba Cloud Qwen-Max.**

![Anchor Logo](assets/images/createimg-ai.png)

Anchor helps people regain control over their habits by combining long-term behavioral memory, real-time risk evaluation, and adaptive AI support. Unlike standard tracking apps, Anchor distinguishes between staying well, experiencing an urge, and resisting challenges.

---

## 🌍 Global AI Hackathon

**Track:** MemoryAgent

Anchor demonstrates how persistent AI memory can create a more psychologically accurate and supportive recovery experience.

---

## ✨ Features

- 🧠 **Persistent Behavioral Memory:** Remembers goals, triggers, and identity statements across sessions.
- ⚓ **Redefined Urge Logging:** Distinguishes between wellness check-ins ("No urge") and actual urge events (Intensity 1-5).
- 🤖 **Qwen-Max Intelligence:** Powered by Alibaba Cloud’s high-performance models via the DashScope API.
- 📈 **Segregated Metrics:** Separate tracking for Days Checked In, Urges Experienced, Urges Resisted, and Relapses.
- 🔒 **Security-First Design:** Features an inactivity-based PIN Lock and strict Row-Level Security (RLS).
- 🔔 **Discreet Support:** Custom notification chimes and personalized companion styles (Supportive, Neutral, or Coaching).

---

## 🏗️ Technical Architecture

Anchor uses a **Tri-Stage Intelligence Loop**:

1. **Log Collection:** User logs wellness or urges via a redefined logic gate.
2. **Behavioral Reasoning:** Supabase Edge Functions (Qwen-Max) analyze the logs, factoring in intensity, frequency, and time of day.
3. **State Synthesis:** The AI updates the user's `recovery_score` and `risk_level`, providing a fresh "Weekly Insight" and "Recommended Action" on the dashboard.

---

## 🧠 MemoryAgent Implementation

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
- **AI Engine:** Alibaba Cloud Qwen-Max (DashScope Workspace Endpoint)
- **Deployment:** Vercel

---

## 🚀 Getting Started

1. Set up your Supabase project.
2. Configure the `QWEN_API_KEY` in your Supabase Edge Function secrets.
3. Use the integrated SQL tools to set up the `profiles`, `user_memories`, and `urge_logs` schema.

---

## 🔒 Security
- **Inactivity PIN Lock:** Automatically secures the app after a customizable period of idle time.
- **Privacy Mode:** Notification text is kept discreet to protect user privacy in public spaces.

Built for the Global AI Hackathon 2026.