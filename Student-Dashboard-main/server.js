import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_KEY = process.env.GROQ_API_KEY;

if (!GROQ_KEY) {
  console.warn("GROQ_API_KEY not set. Put it in .env");
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Doubt solver
app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Missing question" });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a helpful academic tutor. Explain step-by-step and be concise." },
          { role: "user", content: question }
        ],
        max_tokens: 800
      })
    });
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || "No response";
    res.json({ answer });
  } catch (err) {
    console.error("ask error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Notes explainer
app.post("/api/explain-notes", async (req, res) => {
  try {
    const { notesText } = req.body;
    if (!notesText) return res.status(400).json({ error: "Missing notesText" });
    const prompt = `You are a patient teacher. Explain the following student notes in clear, simple language, provide summaries, key points, and examples if relevant. Notes:\n\n${notesText}`;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a helpful notes explainer for students." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1200
      })
    });
    const data = await response.json();
    const explanation = data?.choices?.[0]?.message?.content || "No response";
    res.json({ explanation });
  } catch (err) {
    console.error("explain-notes error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Generate MCQ test
app.post("/api/generate-test", async (req, res) => {
  try {
    const { subject, topic, count } = req.body;
    if (!subject || !topic || !count) return res.status(400).json({ error: "subject, topic, count required" });
    const prompt = `Create ${count} multiple-choice questions (4 options each) on the topic "${topic}" for subject "${subject}". For each question return a JSON object with fields: question, options (array of 4 strings), answer (index 0-3). Return a JSON array only.`;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a helpful MCQ generator for student practice." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000
      })
    });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "[]";
    let questions = [];
    try {
      questions = JSON.parse(text);
    } catch (e) {
      const m = text.match(/\[.*\]/s);
      if (m) {
        try { questions = JSON.parse(m[0]); } catch {}
      }
    }
    res.json({ questions, raw: text });
  } catch (err) {
    console.error("generate-test error:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.listen(PORT, () => console.log(`Student Dashboard running at http://localhost:${PORT}`));
