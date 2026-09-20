import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const extensions = ['.ts', '.tsx', '.mts', '.js', '.mjs']

process.env.DATABASE_URL ??= 'postgres://cursork:cursork@127.0.0.1:5432/cursork'
process.env.DIRECT_URL ??= process.env.DATABASE_URL
process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret'
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000'

const stubSpecifiers = new Map([
  ['server-only', path.join(root, 'tests', 'stubs', 'server-only.mjs')],
  ['next/cache', path.join(root, 'tests', 'stubs', 'next-cache.mjs')],
])

function resolveAppSpecifier (specifier) {
  const basePath = path.join(root, specifier.slice(2))

  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return pathToFileURL(basePath).href
  }

  for (const extension of extensions) {
    const candidate = `${basePath}${extension}`
    if (fs.existsSync(candidate)) {
      return pathToFileURL(candidate).href
    }
  }

  for (const extension of extensions) {
    const candidate = path.join(basePath, `index${extension}`)
    if (fs.existsSync(candidate)) {
      return pathToFileURL(candidate).href
    }
  }

  return null
}

registerHooks({
  resolve (specifier, context, nextResolve) {
    const stubPath = stubSpecifiers.get(specifier)
    if (stubPath) {
      return nextResolve(pathToFileURL(stubPath).href, context)
    }

    if (specifier.startsWith('@/')) {
      const resolved = resolveAppSpecifier(specifier)
      if (resolved) {
        return nextResolve(resolved, context)
      }
    }

    return nextResolve(specifier, context)
  },
})
