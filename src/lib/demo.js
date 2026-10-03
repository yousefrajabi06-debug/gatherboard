// Netlify's static preview is deliberately browser-only, not a hosted booking API.
const key = "gatherboard.demo.v1";
const categories = ["Workshop", "Community", "Study group"];
const today = () => new Date().toISOString().slice(0, 10);
const clean = (value, max) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= max;
function validEvent(event) {
  return (
    event &&
    typeof event.id === "string" &&
    clean(event.title, 100) &&
    clean(event.venue, 100) &&
    clean(event.description, 1000) &&
    categories.includes(event.category) &&
    typeof event.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
    !Number.isNaN(Date.parse(event.date)) &&
    new Date(event.date).toISOString().slice(0, 10) === event.date &&
    Number.isInteger(event.capacity) &&
    event.capacity >= 1 &&
    event.capacity <= 200
  );
}
function seed() {
  return {
    reservations: [],
    events: [
      [
        "Build a tiny web app",
        "Workshop",
        "Demo room A",
        "Practice turning a small idea into a page.",
        12,
      ],
      [
        "Coffee & code conversations",
        "Community",
        "Demo common room",
        "Share what you are learning in this fictional meetup.",
        20,
      ],
      [
        "JavaScript study circle",
        "Study group",
        "Demo library space",
        "Practice array methods, fetch, and explaining your code.",
        8,
      ],
    ].map(([title, category, venue, description, capacity], index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + 7 + index * 4);
      return {
        id: crypto.randomUUID(),
        title,
        category,
        venue,
        description,
        capacity,
        date: date.toISOString().slice(0, 10),
      };
    }),
  };
}
export function createDemoRequest(storage) {
  function save(state) {
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch {
      throw new Error(
        "Browser storage is unavailable or full. Demo changes could not be saved.",
      );
    }
  }
  function load() {
    let raw;
    try {
      raw = storage.getItem(key);
    } catch {
      throw new Error(
        "Browser storage is unavailable. Enable it to use this demo.",
      );
    }
    if (raw === null) {
      const state = seed();
      save(state);
      return state;
    }
    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      throw new Error(
        "Saved demo data could not be read. Clear this site’s browser data to start again.",
      );
    }
    if (
      !state ||
      !Array.isArray(state.events) ||
      !state.events.every(validEvent) ||
      !Array.isArray(state.reservations) ||
      !state.reservations.every(
        (r) =>
          r &&
          typeof r.id === "string" &&
          typeof r.eventId === "string" &&
          clean(r.alias, 50),
      )
    )
      throw new Error(
        "Saved demo data is invalid. Clear this site’s browser data to start again.",
      );
    return state;
  }
  return async function demoRequest(path, options = {}) {
    const state = load();
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : {};
    if (path === "/events" && method === "GET")
      return state.events
        .map((event) => ({
          ...event,
          reserved: state.reservations.filter((r) => r.eventId === event.id)
            .length,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    if (path === "/events" && method === "POST") {
      const event = { ...body, id: crypto.randomUUID() };
      if (!validEvent(event) || event.date < today())
        throw new Error(
          "Use valid event details, a current/future date, and a capacity from 1 to 200.",
        );
      for (const field of ["title", "venue", "description"])
        event[field] = event[field].trim();
      state.events.push(event);
      save(state);
      return { id: event.id };
    }
    const match = path.match(/^\/events\/([^/]+)\/reservations$/);
    if (match && method === "POST") {
      const event = state.events.find((e) => e.id === match[1]);
      if (!event) throw new Error("This event no longer exists.");
      if (event.date < today())
        throw new Error("This event has already taken place.");
      if (!clean(body.alias, 50) || body.alias.trim().length < 2)
        throw new Error("Use a fictional alias between 2 and 50 characters.");
      const reserved = state.reservations.filter((r) => r.eventId === event.id);
      if (reserved.length >= event.capacity)
        throw new Error("This event is full. Try another gathering.");
      if (
        reserved.some(
          (r) => r.alias.toLowerCase() === body.alias.trim().toLowerCase(),
        )
      )
        throw new Error("This alias already has a place at this event.");
      const reservation = {
        id: crypto.randomUUID(),
        eventId: event.id,
        alias: body.alias.trim(),
      };
      state.reservations.push(reservation);
      save(state);
      return reservation;
    }
    if (path.startsWith("/reservations/") && method === "DELETE") {
      const id = path.slice("/reservations/".length);
      // Idempotent in the browser preview, including already removed references.
      state.reservations = state.reservations.filter((r) => r.id !== id);
      save(state);
      return null;
    }
    throw new Error("This action is not available in the browser demo.");
  };
}
