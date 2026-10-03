import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoRequest } from "./demo.js";
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
};
const post = (body) => ({ method: "POST", body: JSON.stringify(body) });
test("browser demo persists events and reservations, then releases capacity", async () => {
  const storage = memory(),
    request = createDemoRequest(storage);
  const event = await request(
    "/events",
    post({
      title: "Demo",
      venue: "Demo venue",
      description: "A fictional test",
      category: "Workshop",
      date: "2099-01-01",
      capacity: 1,
    }),
  );
  const reservation = await request(
    `/events/${event.id}/reservations`,
    post({ alias: "Demo Guest" }),
  );
  const reloaded = createDemoRequest(storage);
  assert.equal(
    (await reloaded("/events")).find((e) => e.id === event.id).reserved,
    1,
  );
  await assert.rejects(
    reloaded(
      `/events/${event.id}/reservations`,
      post({ alias: "Another Demo" }),
    ),
    /full/,
  );
  await reloaded(`/reservations/${reservation.id}`, { method: "DELETE" });
  assert.equal(
    (await reloaded("/events")).find((e) => e.id === event.id).reserved,
    0,
  );
});
test("browser demo rejects invalid dates and duplicate aliases", async () => {
  const request = createDemoRequest(memory());
  await assert.rejects(
    request(
      "/events",
      post({
        title: "Demo",
        venue: "Demo",
        description: "Demo",
        category: "Workshop",
        date: "2099-02-30",
        capacity: 2,
      }),
    ),
    /valid event/,
  );
  const [event] = await request("/events");
  await request(
    `/events/${event.id}/reservations`,
    post({ alias: "Demo Guest" }),
  );
  await assert.rejects(
    request(`/events/${event.id}/reservations`, post({ alias: "demo guest" })),
    /already/,
  );
});
test("storage errors do not pretend changes were saved", async () => {
  const request = createDemoRequest({
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  await assert.rejects(request("/events"), /could not be saved/);
});
test("malformed saved data gives a recovery instruction without overwriting it", async () => {
  let wrote = false;
  const request = createDemoRequest({
    getItem: () => "{broken",
    setItem: () => {
      wrote = true;
    },
  });
  await assert.rejects(request("/events"), /Clear this site/);
  assert.equal(wrote, false);
});
