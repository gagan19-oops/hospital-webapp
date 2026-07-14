// Thin fetch wrapper: always sends the session cookie, always expects/parses
// JSON, and throws a normal Error (with .status and .data attached) on any
// non-2xx response so callers can just try/catch.

async function request(method, url, body) {
  const opts = {
    method,
    credentials: "include",
    headers: {},
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, opts);
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body ?? {}),
  del: (url) => request("DELETE", url),
};
