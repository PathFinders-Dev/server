import { Hono } from "hono";
import { createNodeWebSocket } from "@hono/node-ws";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { serve } from "@hono/node-server";
import db from "./db/index.js";
import { runAnalysis } from "./vertex-ai.js";
import { objectsCoordinatesTable } from "./db/schema.js";
import { analysisWithAi } from "./genai.js";

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use(
  "*",
  cors({
    origin: "*",
  })
);

// Check API is Healthy
app.get("/", (c) => {
  console.log("Health check");
  return c.json({ status: "Healthy" });
});

app.get("/object-detections", async (c) => {
  const objectCoordinates = await db.query.objectsCoordinatesTable.findMany();
  return c.json(objectCoordinates);
});

app.post(
  "/object-detections",
  zValidator(
    "json",
    z.array(
      z.object({
        name: z.string().min(1),
        probability: z.number(),
        screenWidth: z.number().min(1),
        screenHeight: z.number().min(1),
        x1: z.number().min(1),
        y1: z.number().min(1),
        x2: z.number().min(1),
        y2: z.number().min(1),
        time: z.string().min(1),
        latitude: z.number().min(1),
        longitude: z.number().min(1),
      })
    )
  ),
  async (c) => {
    const objectCoordinates = c.req.valid("json");
    try {
      await db.insert(objectsCoordinatesTable).values(
        objectCoordinates.map((data) => ({
          ...data,
          time: new Date(data.time),
        }))
      );
    } catch (e) {
      console.error(e);
      return c.json({ error: "Error inserting data" }, { status: 500 });
    }
    return c.json({ status: "ok" });
  }
);

// WebSocket
app.get(
  "/ws",
  upgradeWebSocket(() => {
    let intervalId: string | number | NodeJS.Timeout | undefined;
    return {
      onOpen(_event, ws) {
        intervalId = setInterval(() => {
          analysisWithAi().then((analysisData) => {
            ws.send(JSON.stringify(analysisData));
          });
        }, 10000);
      },
      onMessage(event) {
        console.log(`Message from client: ${event.data}`);
      },
      onClose() {
        clearInterval(intervalId);
      },
    };
  })
);

const server = serve(app);
injectWebSocket(server);

export default server;
