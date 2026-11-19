# Public event discovery with WebMCP

The homepage and `/events` expose two **read-only, browser-native** tools:

- `search_public_events`: search event titles, upcoming/past/all, bounded result count.
- `get_public_event`: retrieve a known event ID's public title, dates and Luma URL.

The homepage tools see only the same upcoming preview used by its event cards (currently at most three). The events page uses its existing full public calendar snapshot. Results identify that scope and the render timestamp; they do not claim a live query, source freshness, or definitive absence when upstream data is unavailable. Past/upcoming follows the existing UI's start-time convention.

No new API routes, network calls, database queries or writes run when tools execute. No attendee details, guest approval, credits, signup, account actions or automatic navigation are exposed. Payloads use an explicit public field allowlist, not raw Luma/database records. Only HTTPS Luma links are returned. Event titles remain untrusted external content; annotations declare that fact. Existing event fetching/caching is unchanged.

The invisible `PublicEventsWebMCP` component returns `null`, preserving layout. Chrome's `use-webmcp-tool` 0.3.0 hook uses the current `document.modelContext` interface, feature detection and AbortSignal registration cleanup. It does nothing in unsupported browsers. No polyfill is installed and there is no legacy `navigator.modelContext` shim. Tools unmount on navigation away from their page.

## Verify

1. Run `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` in a correctly configured development environment.
2. In a WebMCP-capable secure browser, use the WebMCP inspector (or `await document.modelContext.getTools()`) on `/events`; verify exactly these two tool names.
3. Search for an event title displayed on that page and compare returned dates/URL to its card. Request that exact ID with `get_public_event`.
4. Check missing IDs and invalid limits return errors, not success. No request should be made by execution itself.
5. Move to homepage: the tool description and result scope should identify the smaller preview. Navigate to `/about` or admin: these event tools should be removed. Repeat back/forward and verify no duplicate tool registration.
6. Use a normal unsupported browser: page appearance, links and event tabs remain unchanged.

WebMCP is an evolving preview API; native execution requires browser support/flags. A JS mock can test registration behavior but is not proof of native support.

References checked November 19, 2026:
- https://developer.chrome.com/docs/ai/webmcp/imperative-api
- https://webmachinelearning.github.io/webmcp/
- https://github.com/GoogleChromeLabs/use-webmcp-tool

### Build prerequisite discovered during validation

The authenticated admin dashboard layout explicitly uses `dynamic = 'force-dynamic'` so its session-specific queries run at request time, not during static prerendering. The existing admin access gate is unchanged. This does not repair database connectivity: admin requests still require valid database configuration. A local production build can exercise public fallbacks using a non-production dummy database URL; no production credentials are needed for that check.
