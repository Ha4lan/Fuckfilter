import { Hono } from "hono";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const query = c.req.query("q");

    if (!query) {
      return c.text("Please use ?q=base64_url", 400);
    }

    const url = decodeURIComponent(atob(query));
    const method = c.req.method;
    const body = await c.req.blob();
    const headers = await c.req.raw.headers;

    return await fetch(url, {
      method,
      body: method === "GET" || method === "HEAD" ? null : body,
      headers,
    });
  } catch (_e) {
    return c.text("Error", 500);
  }
});

Deno.serve(app.fetch);
