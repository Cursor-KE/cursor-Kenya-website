import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'
import { config as loadEnv } from 'dotenv'

const root = path.resolve(import.meta.dirname, '..')
const extensions = ['.ts', '.tsx', '.mts', '.js', '.mjs']
const stubSpecifiers = new Map([
  ['next/cache', path.join(root, 'tests/stubs/next-cache.mjs')],
  ['server-only', path.join(root, 'tests/stubs/server-only.mjs')],
])

loadEnv({ path: path.join(root, '.env'), quiet: true })
loadEnv({ path: path.join(root, '.env.local'), override: true, quiet: true })

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
