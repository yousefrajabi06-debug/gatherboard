import { mkdirSync } from "node:fs";
import express from "express";
import { fileURLToPath } from "node:url";
import { createDatabase } from "./database.js";
import { createApp } from "./app.js";
const folder = fileURLToPath(new URL("./data/", import.meta.url));
mkdirSync(folder, { recursive: true });
const db = createDatabase(folder + "/gatherboard.sqlite", true);
const app = createApp(db);
app.use(express.static(fileURLToPath(new URL("../dist/", import.meta.url))));
const server = app.listen(3001, "127.0.0.1", () =>
  console.log("GatherBoard local API: http://127.0.0.1:3001"),
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
