import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const extensions = ['.ts', '.tsx', '.mts', '.js', '.mjs']
const emptyModuleUrl = 'data:text/javascript,export%20%7B%7D'

process.env.DATABASE_URL ??= 'postgres://test:test@127.0.0.1:1/test'

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
    if (specifier === 'server-only') {
      return { url: emptyModuleUrl, shortCircuit: true }
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
