import { GoogleGenAI } from "@google/genai";
import type { Detection } from "./gemeni.js";
import db from "./db/index.js";
import { objectsCoordinatesTable } from "./db/schema.js";
import { gte } from "drizzle-orm";
import "dotenv/config";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const prompt = `Analyze fire/smoke detection alerts with these strict requirements:

1. For EACH detection:
   - Type: Only classify as "fire" or "smoke" (case-sensitive)
   - Confidence: Convert to float with 1 decimal (e.g., 85 → 85.0)
   - Risk Level:
     • Critical: ≥90% confidence
     • High: 75-89.9%
     • Medium: 50-74.9%
     • Low: <50%

2. Validation Rules:
   - Skip entries with invalid types or confidence ∉ [0,100]
   - Maintain original detection order

3. Output:
   - JSON ONLY (no text/markdown)
   - overall_risk = Highest individual risk_level
   - Include ONLY valid detections

Example Transformation:
[Input]
{type: "fire", confidence: 85, time: "2023-08-15T14:30:00Z"}
{type: "smoke", confidence: 110, time: "2023-08-15T14:31:00Z"}

[Output]
{
  "detections": [
    {"type": "fire", "confidence": 85.0, "risk_level": "high"}
  ],
  "overall_risk": "high"
}

NOW PROCESS THIS INPUT:`;

export async function analysisWithAi() {
  const detectionData = await db.query.objectsCoordinatesTable.findMany({
    where: gte(objectsCoordinatesTable.createdAt, new Date(Date.now() - 5000)),
    with: {
      id: false,
      createdAt: false,
    },
  });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${prompt} ${JSON.stringify(detectionData)}`,
  });
  console.log(JSON.parse(response.text!));
  return JSON.parse(response.text!);
}
