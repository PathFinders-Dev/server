import { GoogleAuth } from "google-auth-library";
import db from "./db/index.js";
import { gte } from "drizzle-orm";
import { objectsCoordinatesTable } from "./db/schema.js";
function calculateAreaPercent(d) {
    const width = d.x2 - d.x1;
    const height = d.y2 - d.y1;
    const area = width * height;
    const totalArea = d.screenWidth * d.screenHeight;
    return (area / totalArea) * 100;
}
async function analyzeWithVertexAI(detections) {
    const prompt = `Analyze fire/smoke detections:
For each detection:
- Type: {name}
- Confidence: {property}%
- Screen Coverage: {coverage:.1f}%
- Timestamp: {time}

Respond in JSON format:
{
  "detections": [
    {
      "type": "fire|smoke",
      "confidence": float,
      "coverage_percent": float,
      "risk_level": "low|medium|high|critical",
      "recommended_action": str
    }
  ],
  "overall_risk": "low|medium|high|critical"
}`;
    const formatted = detections
        .map((d, i) => `Detection ${i + 1}: ${d.name} (${d.probability}%) covering ${calculateAreaPercent(d).toFixed(1)}% of screen`)
        .join("\n");
    const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
    const client = await auth.getClient();
    const project = "solutionchallenge-pioneers";
    const region = "asia-southeast1";
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/gemini-1.5-flash:predict`;
    const requestBody = {
        instances: [
            {
                system_instruction: prompt,
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `Analyze these detections:\n${formatted}` }],
                    },
                ],
            },
        ],
        parameters: {
            temperature: 0.2,
            maxOutputTokens: 512,
            topP: 0.95,
        },
    };
    const res = await client.request({
        url: endpoint,
        method: "POST",
        data: requestBody,
    });
    // @ts-ignore
    const prediction = res.data?.predictions?.[0]?.content;
    return JSON.parse(prediction);
}
export async function runAnalysis() {
    const detectionData = await db.query.objectsCoordinatesTable.findMany({
        where: gte(objectsCoordinatesTable.createdAt, new Date(Date.now() - 5000)),
        with: {
            id: false,
            createdAt: false,
        },
    });
    return await analyzeWithVertexAI(detectionData);
}
