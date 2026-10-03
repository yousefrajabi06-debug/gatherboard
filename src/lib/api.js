export const demoMode = import.meta.env.MODE === "demo";
export async function request(path, options = {}) {
  if (demoMode) {
    const { createDemoRequest } = await import("./demo.js");
    return createDemoRequest(localStorage)(path, options);
  }
  let response;
  try {
    response = await fetch("/api" + path, {
      signal: AbortSignal.timeout(12000),
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "The local API is unavailable. Start the project with npm run dev and try again.",
    );
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
  if (!response.ok)
    throw new Error(data.error || "The request failed. Please try again.");
  return data;
}
