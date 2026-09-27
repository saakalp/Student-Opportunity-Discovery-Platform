const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const OPPS_PATH = path.join(__dirname, "data", "opportunities.json");
let opportunities = JSON.parse(fs.readFileSync(OPPS_PATH, "utf-8"));

// GET /api/opportunities?category=&search=&level=
app.get("/api/opportunities", (req, res) => {
  const { category, search, level } = req.query;
  let results = opportunities;

  if (category && category !== "all") {
    results = results.filter((o) => o.category === category);
  }
  if (level && level !== "all") {
    results = results.filter((o) => o.level === level);
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.org.toLowerCase().includes(q) ||
        o.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  res.json({ count: results.length, results });
});

// GET /api/categories - distinct categories for filter chips
app.get("/api/categories", (req, res) => {
  const cats = [...new Set(opportunities.map((o) => o.category))];
  res.json(cats);
});

// POST /api/recommend  { skills: [], interests: [], categories: [] }
// Simple, explainable tag-overlap scoring - no black box, easy to reason about.
app.post("/api/recommend", (req, res) => {
  const skills = (req.body.skills || []).map((s) => s.toLowerCase().trim());
  const interests = (req.body.interests || []).map((s) => s.toLowerCase().trim());
  const categories = (req.body.categories || []).map((s) => s.toLowerCase().trim());
  const profileTags = new Set([...skills, ...interests]);

  const scored = opportunities.map((o) => {
    const oppTags = o.tags.map((t) => t.toLowerCase());
    const tagMatches = oppTags.filter((t) => profileTags.has(t)).length;
    const categoryMatch = categories.length === 0 || categories.includes(o.category) ? 1 : 0;

    // score: tag overlap dominates, category preference gives a smaller boost
    const maxPossible = Math.max(oppTags.length, 1);
    let score = (tagMatches / maxPossible) * 80 + categoryMatch * 20;
    score = Math.round(Math.min(score, 100));

    return { ...o, matchScore: score, matchedTags: oppTags.filter((t) => profileTags.has(t)) };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  res.json({ results: scored });
});

app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`SignalBoard running on port ${PORT}`);
});
