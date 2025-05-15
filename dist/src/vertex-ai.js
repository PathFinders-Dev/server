import { HarmBlockThreshold, HarmCategory, VertexAI } from "@google-cloud/vertexai";
import db from "./db/index.js";
import { gte } from "drizzle-orm";
import { objectsCoordinatesTable } from "./db/schema.js";
const project = 'solutionchallenge-pioneers';
const location = 'us-central1';
const textModel = 'gemini-1.0-pro';
const visionModel = 'gemini-1.0-pro-vision';
const vertexAI = new VertexAI({ project: project, location: location });
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
// Instantiate Gemini models
const generativeModel = vertexAI.getGenerativeModel({
    model: textModel,
    // The following parameters are optional
    // They can also be passed to individual content generation requests
    safetySettings: [{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }],
    generationConfig: { maxOutputTokens: 256 },
    systemInstruction: {
        role: 'system',
        parts: [{ "text": prompt }]
    },
});
const generativeVisionModel = vertexAI.getGenerativeModel({
    model: visionModel,
});
const generativeModelPreview = vertexAI.preview.getGenerativeModel({
    model: textModel,
});
async function generateContent(detections) {
    const request = {
        contents: [{ role: 'user', parts: [{ text: `Directions: ${JSON.stringify(detections)}` }] }],
    };
    const result = await generativeModel.generateContent(request);
    const response = result.response;
    console.log('Response: ', JSON.stringify(response));
    return response;
}
export async function runAnalysis() {
    const detectionData = await db.query.objectsCoordinatesTable.findMany({
        where: gte(objectsCoordinatesTable.createdAt, new Date(Date.now() - 5000)),
        with: {
            id: false,
            createdAt: false,
        },
    });
    return await generateContent(detectionData);
}
