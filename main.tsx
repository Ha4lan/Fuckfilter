import type { FC } from 'hono/jsx'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  try{
  let query = c.req.query('q')
  var url   = decodeURIComponent(atob(query));
  }catch
  { c.status(500)}
  return c.text(url)
})

Deno.serve(app.fetch)
