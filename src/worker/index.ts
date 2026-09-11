import { Hono } from "hono";
import chat from "@/worker/routes/chat";
import generate from "@/worker/routes/generate";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "SlideForge" }));
app.route("/api", generate);
app.route("/api", chat);

export default app;
