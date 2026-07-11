export const NextResponse = {
  json (body, init) {
    return Response.json(body, init)
  },
}

export function after (callback) {
  callback()
}
