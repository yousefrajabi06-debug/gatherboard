import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createDatabase } from "./database.js";
import { createApp } from "./app.js";
async function fixture() {
  const db = createDatabase();
  const server = createApp(db).listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    db,
    base: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
  };
}
const event = {
  title: "Fictional workshop",
  date: "2099-01-01",
  category: "Workshop",
  venue: "Demo room",
  description: "An automated test event.",
  capacity: 1,
};
const post = (base, path, body) =>
  fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("event validation rejects invalid dates and capacity", async () => {
  const f = await fixture();
  try {
    for (const fields of [
      { ...event, date: "2026-02-31" },
      { ...event, capacity: 0 },
      { ...event, title: " " },
    ]) {
      assert.equal((await post(f.base, "/api/events", fields)).status, 400);
    }
  } finally {
    await f.close();
  }
});
test("capacity cannot be exceeded by concurrent reservations", async () => {
  const f = await fixture();
  try {
    const created = await post(f.base, "/api/events", event);
    assert.equal(created.status, 201);
    const { id } = await created.json();
    const results = await Promise.all(
      ["Demo One", "Demo Two"].map((alias) =>
        post(f.base, `/api/events/${id}/reservations`, { alias }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    const events = await (await fetch(f.base + "/api/events")).json();
    assert.equal(events[0].reserved, 1);
    assert.equal(JSON.stringify(events).includes("Demo One"), false);
  } finally {
    await f.close();
  }
});
test("cancellation releases capacity and does not repeat", async () => {
  const f = await fixture();
  try {
    const { id } = await (await post(f.base, "/api/events", event)).json();
    const reservation = await (
      await post(f.base, `/api/events/${id}/reservations`, {
        alias: "Demo Person",
      })
    ).json();
    assert.equal(
      (
        await fetch(f.base + "/api/reservations/" + reservation.id, {
          method: "DELETE",
        })
      ).status,
      204,
    );
    assert.equal(
      (
        await fetch(f.base + "/api/reservations/" + reservation.id, {
          method: "DELETE",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await post(f.base, `/api/events/${id}/reservations`, {
          alias: "Demo Next",
        })
      ).status,
      201,
    );
  } finally {
    await f.close();
  }
});
test("duplicate aliases are case-insensitively rejected", async () => {
  const f = await fixture();
  try {
    const { id } = await (
      await post(f.base, "/api/events", { ...event, capacity: 3 })
    ).json();
    assert.equal(
      (
        await post(f.base, `/api/events/${id}/reservations`, {
          alias: "Demo Alias",
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await post(f.base, `/api/events/${id}/reservations`, {
          alias: "demo alias",
        })
      ).status,
      409,
    );
  } finally {
    await f.close();
  }
});
test("parameterized SQL preserves text without executing it", async () => {
  const f = await fixture();
  try {
    const title = "Demo'); DROP TABLE events; --";
    assert.equal(
      (await post(f.base, "/api/events", { ...event, title })).status,
      201,
    );
    const rows = await (await fetch(f.base + "/api/events")).json();
    assert.equal(rows[0].title, title);
  } finally {
    await f.close();
  }
});
test("malformed JSON and foreign browser origins return safe errors", async () => {
  const f = await fixture();
  try {
    const response = await fetch(f.base + "/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "The request could not be read.",
    });
    assert.equal(
      (
        await fetch(f.base + "/api/events", {
          headers: { Origin: "https://example.com" },
        })
      ).status,
      403,
    );
  } finally {
    await f.close();
  }
});
