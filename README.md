# AI Research Scientist

> Multi-agent system that automatically reads papers, generates hypotheses, writes experiments, and evaluates results.

A six-agent pipeline powered by Claude or GPT that automates the early stages of research: literature search, paper summarisation, hypothesis generation, experiment design, code generation, and evaluation.

## Demo

The app runs in two modes:

- **Demo** - instant results with cached data, no API key needed
- **Live** - real arXiv search + AI-powered agents (Claude or OpenAI)

## Pipeline

```
Research Query
  → [Agent 01] Paper Search (arXiv API - always live, free)
  → [Agent 02] Summarisation (Claude/GPT)
  → [Agent 03] Hypothesis Generation (Claude/GPT)
  → [Agent 04] Experiment Design (Claude/GPT)
  → [Agent 05] Code Generator (Claude/GPT)
  → [Agent 06] Evaluator (Claude/GPT)
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
- **Dual AI provider** — Claude Sonnet 4 or GPT, your choice
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

## Licence and attribution

Released under the MIT Licence. See [LICENSE](LICENSE).

Copyright (c) 2026 Oke Iyanuoluwa Enoch.

You are free to use, modify and build on this work. The licence asks one thing
in return, and it is not optional: keep the copyright notice and the licence
text with any copy or substantial portion of the software. That notice is how
the work stays credited to its author.

If you fork this, publish something derived from it, or use it in a product,
paper or demo, please credit it visibly and link back:

> Built on [Multi-Agent_AI_Research](https://github.com/Iyanuoluwa007/Multi-Agent_AI_Research) by Oke Iyanuoluwa Enoch.

The MIT Licence covers this repository own code only. Any third-party data,
pretrained weights, papers or assets that may be present remain the property of
their owners and are subject to their own terms.