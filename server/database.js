import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export function createDatabase(filename = ":memory:", seed = false) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL,
      category TEXT NOT NULL, venue TEXT NOT NULL, description TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 200)
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id),
      alias TEXT NOT NULL COLLATE NOCASE,
      UNIQUE(event_id, alias)
    );`);
  if (
    seed &&
    db.prepare("SELECT COUNT(*) AS count FROM events").get().count === 0
  ) {
    const insert = db.prepare(
      "INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    const samples = [
      [
        "Build a tiny web app",
        "Workshop",
        "Demo room A",
        "A fictional beginner workshop. Bring a small idea and practice turning it into a page.",
        12,
      ],
      [
        "Coffee & code conversations",
        "Community",
        "Demo common room",
        "A fictional meetup for sharing what you are learning and asking good questions.",
        20,
      ],
      [
        "JavaScript study circle",
        "Study group",
        "Demo library space",
        "A fictional study session on array methods, fetch, and explaining your code out loud.",
        8,
      ],
    ];
    samples.forEach(
      ([title, category, venue, description, capacity], index) => {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() + 7 + index * 4);
        insert.run(
          randomUUID(),
          title,
          date.toISOString().slice(0, 10),
          category,
          venue,
          description,
          capacity,
        );
      },
    );
  }
  return db;
}
