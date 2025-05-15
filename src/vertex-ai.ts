import {
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from "@google-cloud/vertexai";
import type { Detection } from "./gemeni.js";
import db from "./db/index.js";
import { gte } from "drizzle-orm";
import { analysisTable, objectsCoordinatesTable } from "./db/schema.js";

const project = "solutionchallenge-pioneers";
const location = "us-central1";
const textModel = "gemini-1.5-flash-002";

const vertexAI = new VertexAI({ project: project, location: location });

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

// Instantiate Gemini models
const generativeModel = vertexAI.getGenerativeModel({
  model: textModel,
  // The following parameters are optional
  // They can also be passed to individual content generation requests
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
  generationConfig: { maxOutputTokens: 256 },
  systemInstruction: {
    role: "system",
    parts: [{ text: prompt }],
  },
});

const generativeModelPreview = vertexAI.preview.getGenerativeModel({
  model: textModel,
});

async function generateContent(detections: Detection[]) {
  const request = {
    contents: [
      {
        role: "user",
        parts: [{ text: `Directions: ${JSON.stringify(detections)}` }],
      },
    ],
  };
  const result = await generativeModel.generateContent(request);
  const response = result.response;
  console.log("Response: ", JSON.stringify(response));
  return response;
}

export async function runAnalysis() {
  const detectionData = await db.query.objectsCoordinatesTable.findMany({
    where: gte(objectsCoordinatesTable.createdAt, new Date(Date.now() - 1000)),
    with: {
      id: false,
      createdAt: false,
    },
  });
  if (!detectionData || detectionData.length === 0) {
    return {};
  }

  const result = await generateContent(detectionData);
  console.log(result);
  await db.insert(analysisTable).values({ data: JSON.stringify(result) });
  return result;
}
