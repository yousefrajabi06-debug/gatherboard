import { useEffect, useState } from "react";
import Shell from "./components/Shell";
import Dialog from "./components/Dialog";
import EventCard from "./components/EventCard";
import EventForm from "./components/EventForm";
import useSavedState from "./hooks/useSavedState";
import { request } from "./lib/api";
const validReservations = (value) =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      ["id", "eventId", "alias"].every((key) => typeof item[key] === "string"),
  );
export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reserving, setReserving] = useState(null);
  const [canceling, setCanceling] = useState(null);
  const [alias, setAlias] = useState("");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("Explore");
  const [notice, setNotice] = useState("");
  const [reservations, saveReservations, storageError] = useSavedState(
    "gatherboard.reservations.v1",
    [],
    validReservations,
  );
  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await request("/events");
      if (!Array.isArray(data))
        throw new Error("The server returned unexpected event data.");
      setEvents(data);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function createEvent(fields) {
    setBusy(true);
    setFormError("");
    try {
      await request("/events", {
        method: "POST",
        body: JSON.stringify(fields),
      });
      setCreating(false);
      setNotice("Event created.");
      await load();
    } catch (problem) {
      setFormError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  async function reserve(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const result = await request(`/events/${reserving.id}/reservations`, {
        method: "POST",
        body: JSON.stringify({ alias: alias.trim() }),
      });
      saveReservations([...reservations, result]);
      setReserving(null);
      setNotice("Your demo reservation is saved.");
      await load();
    } catch (problem) {
      setFormError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setFormError("");
    try {
      await request(`/reservations/${canceling.id}`, { method: "DELETE" });
      saveReservations(reservations.filter((item) => item.id !== canceling.id));
      setCanceling(null);
      setNotice("Reservation canceled.");
      await load();
    } catch (problem) {
      setFormError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  const visible = events.filter(
    (event) =>
      (category === "All" || event.category === category) &&
      `${event.title} ${event.description} ${event.venue}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Shell section="Community events">
      <section className="heading">
        <div>
          <p className="eyebrow">GOOD THINGS HAPPEN WHEN WE GET TOGETHER</p>
          <h1>
            Find your people.
            <br />
            Make a little space.
          </h1>
          <p className="subtitle">
            A local demo for small gatherings, workshops, and shared curiosity.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setFormError("");
            setCreating(true);
          }}
        >
          ＋ Create an event
        </button>
      </section>
      <div className="demo-note">
        <span>LOCAL LEARNING DEMO</span> Fictional events and aliases only.
        Reservations are stored in a local SQLite database.
      </div>
      <div className="toolbar">
        <div className="tabs">
          {["Explore", "My reservations"].map((name) => (
            <button
              key={name}
              aria-pressed={view === name}
              onClick={() => setView(name)}
            >
              {name}
              {name === "My reservations" ? ` (${reservations.length})` : ""}
            </button>
          ))}
        </div>
        {view === "Explore" && (
          <div className="actions">
            <input
              type="search"
              className="control search"
              aria-label="Search events"
              placeholder="Find your next gathering…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="control"
              aria-label="Filter category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["All", "Workshop", "Community", "Study group"].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p className="sr-only" role="status">
        {notice}
      </p>
      {storageError && (
        <p className="error" role="alert">
          {storageError}
        </p>
      )}
      {loading ? (
        <div className="loading" role="status">
          <h2>Making room for good company…</h2>
          <p>Loading local events.</p>
        </div>
      ) : error ? (
        <div className="empty" role="alert">
          <h2>We could not load the gatherings.</h2>
          <p>{error}</p>
          <button className="secondary" onClick={load}>
            Try again
          </button>
        </div>
      ) : view === "Explore" ? (
        visible.length ? (
          <div className="event-grid">
            {visible.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onReserve={() => {
                  setAlias("");
                  setFormError("");
                  setReserving(event);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <span>◎</span>
            <h2>No events in this view.</h2>
            <p>Try another search or create a fictional event.</p>
          </div>
        )
      ) : reservations.length ? (
        <div className="reservation-list">
          {reservations.map((reservation) => {
            const event = events.find(
              (item) => item.id === reservation.eventId,
            );
            return (
              <article className="panel reservation-card" key={reservation.id}>
                <div>
                  <span className="tag">Reserved locally</span>
                  <h3>{event?.title || "Event unavailable"}</h3>
                  <p>
                    {event?.date} · Alias: {reservation.alias}
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    setFormError("");
                    setCanceling(reservation);
                  }}
                >
                  Cancel reservation
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <span>◎</span>
          <h2>A seat is waiting for you.</h2>
          <p>
            Explore the fictional events and reserve a place to try the full
            flow.
          </p>
          <button className="secondary" onClick={() => setView("Explore")}>
            Explore events
          </button>
        </div>
      )}
      {creating && (
        <Dialog
          title="Create a fictional event"
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <EventForm
            onSave={createEvent}
            onCancel={() => setCreating(false)}
            busy={busy}
            error={formError}
          />
        </Dialog>
      )}
      {reserving && (
        <Dialog
          title="Reserve a place"
          onClose={() => {
            if (!busy) setReserving(null);
          }}
        >
          <p className="reservation-context">{reserving.title}</p>
          <form className="form" onSubmit={reserve}>
            <label>
              Fictional alias
              <input
                autoFocus
                required
                minLength={2}
                maxLength={50}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="e.g. Demo Explorer"
              />
            </label>
            <p className="muted small">
              Use an invented alias. This local demo has no user accounts.
            </p>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setReserving(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Reserving…" : "Confirm reservation"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {canceling && (
        <Dialog
          title="Cancel this reservation?"
          onClose={() => {
            if (!busy) setCanceling(null);
          }}
        >
          <p>Your place will become available again.</p>
          {formError && (
            <p className="error" role="alert">
              {formError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setCanceling(null)}
            >
              Keep my place
            </button>
            <button className="danger" disabled={busy} onClick={cancel}>
              {busy ? "Canceling…" : "Confirm cancellation"}
            </button>
          </div>
        </Dialog>
      )}
    </Shell>
  );
}
