import type { FC } from 'hono/jsx'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  let query = c.req.query('q')
  let url   = decodeURIComponent(atob(query));
  return c.text(url)
})

Deno.serve(app.fetch)
