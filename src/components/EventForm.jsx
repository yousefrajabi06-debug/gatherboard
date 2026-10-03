import { useState } from "react";
export default function EventForm({ onSave, onCancel, busy, error }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    category: "Workshop",
    venue: "",
    description: "",
    capacity: 12,
  });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, capacity: Number(form.capacity) });
      }}
    >
      <label>
        Event title
        <input
          autoFocus
          required
          name="title"
          maxLength={100}
          value={form.title}
          onChange={change}
        />
      </label>
      <div className="form-row">
        <label>
          Date
          <input
            required
            name="date"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={form.date}
            onChange={change}
          />
        </label>
        <label>
          Capacity
          <input
            required
            name="capacity"
            type="number"
            min="1"
            max="200"
            value={form.capacity}
            onChange={change}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Category
          <select name="category" value={form.category} onChange={change}>
            <option>Workshop</option>
            <option>Community</option>
            <option>Study group</option>
          </select>
        </label>
        <label>
          Fictional venue
          <input
            required
            name="venue"
            maxLength={100}
            value={form.venue}
            onChange={change}
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          required
          name="description"
          maxLength={1000}
          rows={3}
          value={form.description}
          onChange={change}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Create event"}
        </button>
      </div>
    </form>
  );
}
