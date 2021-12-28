import * as responses from './responses.js'
import * as config from './config.js'

export class WebServer {
  #server
  #routes = []
  #handlers = []
  constructor(port) {
    const stopThis = this.stop.bind(this)
    this.map('/stop', _ => {
      stopThis()
      return responses.ok('')
    })
    this.#server = Deno.listen({ port: port })
    console.log(`Server listening on ${port}`)
  }

  mapAll(handlersByRoute) {
    for (const k of Object.keys(handlersByRoute)) {
      this.map(k, handlersByRoute[k])
    }
  }

  map(route, handler) {
    this.#routes.push(new URLPattern({ pathname: route }))
    this.#handlers.push(handler)
    if (config.LOG.ROUTES) {
      console.log(`Mapped route at '${route}'`)
    }
  }

  async route(req) {
    for (let i = 0; i < this.#routes.length; i++) {
      const route = this.#routes[i];
      if (route.test(req.url)) {
        const handler = this.#handlers[i]
        let resp
        switch (handler.length) {
          case 1:
            resp = handler(req)
            break
          case 2:
            resp = handler(req, route.exec(req.url))
            break
          default:
            resp = handler()
            break
        }
        return await resp
      }
    }
    return responses.notFound(req.url)
  }

  async #serveHttp(conn) {
    const httpConn = Deno.serveHttp(conn)
    for await (const event of httpConn) {
      let resp;
      try {
        resp = await this.route(event.request)
      } catch (error) {
        resp = responses.internalError(error)
      }
      if (config.LOG.REQUESTS) {
        console.log(JSON.stringify({
          status: resp.status,
          url: event.request.url
        }, null, 2))
      }
      event.respondWith(resp)
    }
  }

  async start() {
    console.log(`Server at ${this.#server.addr.port} started`)
    for await (const conn of this.#server) {
      // Don't await to avoid blocking on each connection
      this.#serveHttp(conn)
    }
  }

  stop() {
    console.log(`Stopping server at ${this.#server.addr.port}...`)
    this.#server.close()
    console.log(`Server at ${this.#server.addr.port} stopped`)
  }
}