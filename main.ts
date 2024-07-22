import { Hono } from 'hono'

const app = new Hono()




app.get('/app', (c) => {
  try{
    let query = c.req.query('q')
    var url   = decodeURIComponent(atob(query));
    return c.text(url) 
  }catch{
     c.status(500)
  }
})

Deno.serve(app.fetch)
