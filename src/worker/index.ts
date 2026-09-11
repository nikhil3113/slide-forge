import { Hono } from "hono";
import chat from "@/worker/routes/chat";
import generate from "@/worker/routes/generate";
import html from "@/worker/routes/html";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "SlideForge" }));
app.route("/api", generate);
app.route("/api", html);
app.route("/api", chat);

export default app;
