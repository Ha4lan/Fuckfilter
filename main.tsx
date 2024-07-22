import type { FC } from 'hono/jsx'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  let query = c.req.query('q')
  let URL   = decodeURIComponent(atob(query));
  return c.text('Hello Hono!')
})

Deno.serve(app.fetch)
