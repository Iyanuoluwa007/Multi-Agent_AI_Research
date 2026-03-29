# AI Research Scientist

> Multi-agent system that automatically reads papers, generates hypotheses, writes experiments, and evaluates results.

A six-agent pipeline powered by Claude or GPT-4o that automates the early stages of research: literature search, paper summarization, hypothesis generation, experiment design, code generation, and evaluation.

## Demo

The app runs in two modes:

- **Demo** — instant results with cached data, no API key needed
- **Live** — real arXiv search + AI-powered agents (Claude or OpenAI)

## Pipeline

```
Research Query
  → [Agent 01] Paper Search (arXiv API - always live, free)
  → [Agent 02] Summarization (Claude/GPT-4o)
  → [Agent 03] Hypothesis Generation (Claude/GPT-4o)
  → [Agent 04] Experiment Design (Claude/GPT-4o)
  → [Agent 05] Code Generator (Claude/GPT-4o)
  → [Agent 06] Evaluator (Claude/GPT-4o)
  → Report + Toolkit (training scripts, dataset downloaders, configs)
```

## Quick Start

### Local Development

```bash
git clone <this-repo>
cd ai-research-scientist
npm install
npm run dev
```

Open http://localhost:5173

### Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Click **Deploy** — no environment variables needed

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## How to Use

1. **Demo mode** — Click "Launch" immediately. No setup needed.
2. **Live mode** — Click the mode badge (top right) → select "Live" → choose Claude or OpenAI → enter your API key → validate → launch.

### Getting API Keys

| Provider | Where | Key Format |
|----------|-------|------------|
| Claude (Anthropic) | [console.anthropic.com](https://console.anthropic.com) → API Keys | `sk-ant-api03-...` |
| OpenAI | [platform.openai.com](https://platform.openai.com) → API Keys | `sk-proj-...` |

**Cost**: ~$0.03–0.08 per full pipeline run. arXiv search is always free.

## Features

- **Real arXiv search** — queries the actual arXiv API (no key needed)
- **Dual AI provider** — Claude Sonnet 4 or GPT-4o, your choice
- **6 specialized agents** — each with domain-specific system prompts
- **Graceful fallback** — if any API call fails, that stage uses demo data
- **Research Toolkit** — generates training scripts, dataset downloaders, configs, evaluation scripts, and a README
- **Full report generation** — 2500+ word academic report via AI or offline fallback
- **Copy everything** — every code block, script, and report has a copy button

## Tech Stack

- React 18 + Vite
- No backend needed — all API calls from browser
- Deploys as static site on Vercel/Netlify/GitHub Pages

## Project Structure

```
ai-research-scientist/
  index.html          # Entry point
  package.json        # Dependencies
  vite.config.js      # Vite config
  vercel.json         # Vercel deploy config
  src/
    main.jsx          # React mount
    App.jsx           # Full application (single file)
```

## API Security Note

API keys are stored in React state only — they are never saved to disk, localStorage, or sent to any server other than the AI provider's API directly. The keys are used for direct browser-to-API calls only.

## License

MIT

---

Built by [Oke Iyanuoluwa Enoch](https://github.com/iyanuoluwa) — MSc Robotics & Automation, University of Salford
