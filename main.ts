import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  let query = c.req.query('q')
  let URL   = decodeURIComponent(atob(encoded));
  return c.text('Hello Hono!')
})

Deno.serve(app.fetch)
