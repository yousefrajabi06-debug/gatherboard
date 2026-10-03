export default function EventCard({ event, onReserve }) {
  const date = new Date(event.date + "T12:00:00Z");
  const full = event.reserved >= event.capacity;
  const past = event.date < new Date().toISOString().slice(0, 10);
  return (
    <article className="event-card">
      <div
        className={`event-cover ${event.category.toLowerCase().replaceAll(" ", "-")}`}
      >
        <span>{event.category}</span>
        <div aria-hidden="true" className="cover-shape" />
        <strong>
          {event.category === "Workshop"
            ? "MAKE / CREATE"
            : event.category === "Community"
              ? "MEET / CONNECT"
              : "LEARN / TOGETHER"}
        </strong>
      </div>
      <div className="event-body">
        <div className="event-date">
          <strong>{date.getUTCDate()}</strong>
          <span>
            {new Intl.DateTimeFormat("en", {
              month: "short",
              timeZone: "UTC",
            }).format(date)}
          </span>
        </div>
        <div className="event-text">
          <h3>{event.title}</h3>
          <p className="event-venue">
            {event.venue} · {event.date}
          </p>
        </div>
        <p className="event-description">{event.description}</p>
        <div className="event-bottom">
          <span>
            {event.capacity - event.reserved} of {event.capacity} places left
          </span>
          <button
            className="primary"
            disabled={full || past}
            onClick={onReserve}
          >
            {past ? "Past event" : full ? "Fully booked" : "Reserve a place"}
          </button>
        </div>
      </div>
    </article>
  );
}
