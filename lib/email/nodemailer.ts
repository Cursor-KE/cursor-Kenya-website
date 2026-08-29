import 'server-only'

import nodemailer, { type SendMailOptions } from 'nodemailer'

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

let missingConfigLogged = false

function readEnv (name: string): string | null {
  const raw = process.env[name]
  if (raw == null) return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

function readBooleanEnv (name: string): boolean | null {
  const value = readEnv(name)?.toLowerCase()
  if (!value) return null
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false
  return null
}

function readSmtpConfig (): SmtpConfig | null {
  const host = readEnv('SMTP_HOST')
  const user = readEnv('SMTP_USER')
  const pass = readEnv('SMTP_PASS')
  const from = readEnv('EMAIL_FROM')
  const rawPort = readEnv('SMTP_PORT') ?? '587'
  const port = Number.parseInt(rawPort, 10)

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    if (!missingConfigLogged) {
      missingConfigLogged = true
      console.warn('[email] SMTP is not fully configured; outbound email is disabled.')
    }
    return null
  }

  return {
    host,
    port,
    secure: readBooleanEnv('SMTP_SECURE') ?? port === 465,
    user,
    pass,
    from,
  }
}

export function isEmailDeliveryConfigured (): boolean {
  return readSmtpConfig() !== null
}

export async function sendEmail (message: Omit<SendMailOptions, 'from'> & { from?: string }): Promise<boolean> {
  const config = readSmtpConfig()
  if (!config) return false

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })

    await transport.sendMail({
      from: message.from ?? config.from,
      ...message,
    })
    return true
  } catch (error) {
    console.error('[email] Failed to send email.', error)
    return false
  }
}
