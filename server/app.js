import express from "express";
import { randomUUID } from "node:crypto";
export const categories = ["Workshop", "Community", "Study group"];
const clean = (value, max) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= max
    ? value.trim()
    : null;
const today = () => new Date().toISOString().slice(0, 10);

export function createApp(db) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  // The demo has no user accounts. Only run it locally with fictional aliases.
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const origin = req.get("origin");
    if (
      origin &&
      ![
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
      ].includes(origin)
    ) {
      return res.status(403).json({
        error: "This local demo does not accept requests from that origin.",
      });
    }
    next();
  });
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.get("/api/events", (req, res) => {
    const events = db
      .prepare(
        `SELECT events.*, COUNT(reservations.id) AS reserved
      FROM events LEFT JOIN reservations ON reservations.event_id = events.id
      GROUP BY events.id ORDER BY date, title`,
      )
      .all();
    res.json(events);
  });
  app.post("/api/events", (req, res) => {
    const body = req.body || {};
    const title = clean(body.title, 100),
      venue = clean(body.venue, 100),
      description = clean(body.description, 1000);
    const validDate =
      typeof body.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.date) &&
      !Number.isNaN(Date.parse(body.date)) &&
      new Date(body.date).toISOString().slice(0, 10) === body.date &&
      body.date >= today();
    if (
      !title ||
      !venue ||
      !description ||
      !categories.includes(body.category) ||
      !validDate ||
      !Number.isInteger(body.capacity) ||
      body.capacity < 1 ||
      body.capacity > 200
    )
      return res.status(400).json({
        error:
          "Use valid event details, a current/future date, and a capacity from 1 to 200.",
      });
    const id = randomUUID();
    db.prepare("INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id,
      title,
      body.date,
      body.category,
      venue,
      description,
      body.capacity,
    );
    res.status(201).json({ id });
  });
  app.post("/api/events/:id/reservations", (req, res) => {
    const alias = clean(req.body?.alias, 50);
    if (!alias || alias.length < 2)
      return res
        .status(400)
        .json({ error: "Use a fictional alias between 2 and 50 characters." });
    // A transaction makes the capacity check and insert a single operation.
    db.exec("BEGIN IMMEDIATE");
    try {
      const event = db
        .prepare("SELECT * FROM events WHERE id = ?")
        .get(req.params.id);
      if (!event) {
        db.exec("ROLLBACK");
        return res.status(404).json({ error: "This event no longer exists." });
      }
      if (event.date < today()) {
        db.exec("ROLLBACK");
        return res
          .status(409)
          .json({ error: "This event has already taken place." });
      }
      const count = db
        .prepare(
          "SELECT COUNT(*) AS count FROM reservations WHERE event_id = ?",
        )
        .get(event.id).count;
      if (count >= event.capacity) {
        db.exec("ROLLBACK");
        return res
          .status(409)
          .json({ error: "This event is full. Try another gathering." });
      }
      const duplicate = db
        .prepare("SELECT id FROM reservations WHERE event_id = ? AND alias = ?")
        .get(event.id, alias);
      if (duplicate) {
        db.exec("ROLLBACK");
        return res
          .status(409)
          .json({ error: "This alias already has a place at this event." });
      }
      const id = randomUUID();
      db.prepare("INSERT INTO reservations VALUES (?, ?, ?)").run(
        id,
        event.id,
        alias,
      );
      db.exec("COMMIT");
      res.status(201).json({ id, eventId: event.id, alias });
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
  app.delete("/api/reservations/:id", (req, res) => {
    const result = db
      .prepare("DELETE FROM reservations WHERE id = ?")
      .run(req.params.id);
    if (!result.changes)
      return res
        .status(404)
        .json({ error: "This reservation has already been removed." });
    res.status(204).end();
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use((error, req, res, next) => {
    // Never return request bodies, database details, or stacks.
    const status =
      error.type === "entity.too.large"
        ? 413
        : error instanceof SyntaxError
          ? 400
          : 500;
    res.status(status).json({
      error:
        status === 500
          ? "Something went wrong. Please try again."
          : "The request could not be read.",
    });
  });
  return app;
}
