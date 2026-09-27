# SignalBoard

**One place to find the internships, hackathons, scholarships, certifications, and courses that actually fit you — instead of ten scattered tabs and a college WhatsApp group.**

Built for FIT FEST 2026 Hackathon (GDG FIT Pune).

Website is live. Try now at : https://signalport.onrender.com/

## Problem

Students miss real opportunities not because they don't exist, but because they're scattered across LinkedIn, Instagram, college groups, Unstop, and a dozen org websites. Nobody has time to scan all of them every week, and there's no simple way to know which ones are actually worth your time given your skills.

## Solution

SignalBoard is a lightweight opportunity aggregator with a profile-based matching layer:

1. **Scan** — browse a live-filterable board of opportunities across 7 categories (internships, hackathons, scholarships, certifications, courses, competitions, workshops).
2. **Profile** — tell it your education, skills, and interests (stored locally, never sent anywhere but your own recommendation request).
3. **Match** — a transparent tag-overlap scoring engine ranks every opportunity by fit (0–100%) and highlights exactly which of your skills matched, instead of a black-box "AI recommendation."
4. **Save** — bookmark opportunities into a personal shortlist dashboard.

## Key features

- Local, no-login student profile (education, skills, interests, preferred categories)
- Search + category + level filtering
- Tag-overlap match scoring with visible, explainable matched tags
- Bookmark / save opportunities to a dashboard
- Sort by deadline or by match score
- Direct external links to apply

## Tech stack

- **Backend:** Node.js + Express — serves a small JSON REST API (`/api/opportunities`, `/api/categories`, `/api/recommend`) and the static frontend from a single container.
- **Frontend:** Vanilla HTML/CSS/JS single-page app (no build step, keeps the container tiny and the deploy fast).
- **Data:** a seeded `data/opportunities.json` (swap for a real DB/scraper later).
- **Storage:** browser `localStorage` for profile + bookmarks (zero backend state, so the container can run on Cloud Run's default stateless, scale-to-zero setup).
- **Deployment:** single Dockerfile, deployed to Google Cloud Run.

## Run locally

```bash
npm install
npm start
# open http://localhost:8080
```

## Deploy to Google Cloud Run

```bash
# from the project root, with gcloud configured and a project selected
gcloud run deploy signalboard \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

`gcloud` will build the container from the Dockerfile and give you a public `*.run.app` URL — that's your submission link.

## Project structure

```
.
├── server.js               # Express app + API routes
├── data/opportunities.json # Seed opportunity data
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── Dockerfile
└── package.json
```

##Author

Sankalp Devkar - Created for a FitFest Competition held at Flora Institute of Technology.
