import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client lazily / safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check API
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Voice Command NLU Parser Endpoint
app.post("/api/voice-command", async (req, res) => {
  try {
    const { transcript, gameType, gameState } = req.body;

    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({ error: "Transcript is required" });
    }

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not configured
      return res.json({
        success: false,
        fallback: true,
        message: "Gemini API key not configured, using local rule fallback.",
      });
    }

    const systemPrompt = `You are a specialized voice command assistant for board game scoring apps (Farkle and Yahtzee).
Your task is to analyze the user's spoken voice transcript during a game and output a structured JSON intent.

Current Game: ${gameType}
Active Player: ${gameState?.activePlayerName || "Active Player"}
Available Categories (for Yahtzee): aces, twos, threes, fours, fives, sixes, threeOfAKind, fourOfAKind, fullHouse, smallStraight, largeStraight, yahtzee, chance

For Farkle:
Possible actionTypes:
- "bank": User wants to bank points. Extract points (number). If they say "bank" or "bank turn" without a number, return points: null (use accrued turn score).
- "farkle": User farkled or busted or scored zero.
- "add_turn_points": User wants to add custom points to turn. Extract points (number).
- "query_score": User is asking who is winning, what the score is, or whose turn it is.
- "undo": User wants to undo last turn or score.

For Yahtzee:
Possible actionTypes:
- "score_category": User wants to enter score for a category. Extract category (exact string from available list) and points (number, default 0 if scratch/zero).
- "yahtzee_bonus": User wants to add or toggle Yahtzee bonus (+100).
- "query_score": User asks who is winning or what the score is.
- "undo": User wants to undo.

Return JSON in this format:
{
  "actionType": "bank" | "farkle" | "add_turn_points" | "score_category" | "yahtzee_bonus" | "query_score" | "undo" | "unknown",
  "points": number | null,
  "category": string | null,
  "spokenFeedback": "Short 1-sentence vocal response to speak aloud to players, e.g. 'Banked 500 points for Sarah!' or 'Recorded 25 points for Full House!'"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `User voice transcript: "${transcript}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionType: { type: Type.STRING },
            points: { type: Type.NUMBER },
            category: { type: Type.STRING },
            spokenFeedback: { type: Type.STRING },
          },
          required: ["actionType", "spokenFeedback"],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      intent: parsedJson,
    });
  } catch (err: any) {
    console.error("Error in /api/voice-command:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process voice command",
    });
  }
});

// Start Vite server in middleware mode for dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
