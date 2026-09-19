import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const extensions = ['.ts', '.tsx', '.mts', '.js', '.mjs']
const serverOnlyStub = 'data:text/javascript,export default {}'
const nextCacheStub = 'data:text/javascript,export function revalidatePath() {}'

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
      return {
        url: serverOnlyStub,
        shortCircuit: true,
      }
    }

    if (specifier === 'next/cache') {
      return {
        url: nextCacheStub,
        shortCircuit: true,
      }
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
