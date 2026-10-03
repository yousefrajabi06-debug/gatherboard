import { useState } from "react";
// Keep persistence explicit: the component supplies the next complete value.
export default function useSavedState(key, initialValue, validate) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initialValue;
      const saved = JSON.parse(raw);
      return validate(saved) ? saved : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [error, setError] = useState("");
  function save(next) {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError("");
    } catch {
      setError(
        "Browser storage is unavailable. These changes last only for this session.",
      );
    }
  }
  return [value, save, error];
}
