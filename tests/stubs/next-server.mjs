export class NextResponse extends Response {
  static json (body, init) {
    return Response.json(body, init)
  }
}
