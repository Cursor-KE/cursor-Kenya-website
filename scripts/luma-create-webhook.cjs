const path = require('node:path')
const { config } = require('dotenv')

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

const apiKey = process.env.LUMA_API_KEY
const routeToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN
const explicitUrl = process.env.LUMA_WEBHOOK_URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL

const eventTypes = (
  process.env.LUMA_WEBHOOK_EVENTS ||
  'event.created,event.updated,event.canceled,calendar.event.added,guest.registered,guest.updated,ticket.registered'
)
  .split(',')
  .map((eventType) => eventType.trim())
  .filter(Boolean)

function getWebhookUrl () {
  if (explicitUrl) return explicitUrl
  if (!appUrl) return null

  const url = new URL('/webhook', appUrl)
  if (routeToken) url.searchParams.set('token', routeToken)
  return url.toString()
}

async function main () {
  if (!apiKey) {
    console.error('LUMA_API_KEY is not set.')
    process.exit(1)
  }

  const webhookUrl = getWebhookUrl()
  if (!webhookUrl) {
    console.error('Set LUMA_WEBHOOK_URL or NEXT_PUBLIC_APP_URL/BETTER_AUTH_URL.')
    process.exit(1)
  }

  const response = await fetch('https://public-api.luma.com/v2/webhooks/create', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-luma-api-key': apiKey,
    },
    body: JSON.stringify({
      url: webhookUrl,
      event_types: eventTypes,
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    console.error(`Luma webhook create failed (${response.status}): ${text}`)
    process.exit(1)
  }

  console.log(text)
  console.error('\nSave the returned `secret` somewhere secure. Luma docs expose it on create.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
