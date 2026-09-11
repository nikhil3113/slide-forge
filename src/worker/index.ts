import { Hono } from "hono";
import generate from "@/worker/routes/generate";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "SlideForge" }));
app.route("/api", generate);

export default app;
