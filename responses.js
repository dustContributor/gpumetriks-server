export const ok = content => json(content ?? 'ok', 200)
export const badRequest = message => json(message ?? 'bad_request', 400)
export const notFound = message => json(message ?? 'not_found', 404)
export const internalError = exception => json(exception == null ? 'internal_error' : {
  name: exception.name,
  message: exception.message,
  stackTrace: exception.stack
}, 500)

export const json = (content, status) => mime(
  JSON.stringify(content, null, 2),
  'application/json',
  status)

export const mime = (content, mimeType, status) => new Response(content, {
  status: status || 200,
  headers: {
    'Content-Type': mimeType
  }
})