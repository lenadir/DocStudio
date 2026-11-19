/**
 * Folds dist/ into one self-contained .html file that runs by double-clicking it,
 * on any PC, with no Node, no server and no internet.
 *
 * Browsers refuse to load ES modules over file://, so the built JS and CSS have to be
 * inlined rather than linked. Run after `vite build`.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '.')
const dist = join(root, 'dist')
const outDir = join(root, 'standalone')
const outFile = join(outDir, 'Certificate-Filler.html')

const asset = (ref) => readFileSync(join(dist, ref.replace(/^\.?\//, '')), 'utf8')

let html = readFileSync(join(dist, 'index.html'), 'utf8')
const inlined = []

// Done FIRST, while the document is still small. Once the bundle is inlined, the
// document contains JS string literals with '</head>' inside them (SheetJS has one),
// and a naive replace would corrupt the code instead of editing the real markup.
html = html.replace(
  '</head>',
  '  <meta name="generator" content="Certificate Filler - standalone single file" />\n  </head>',
)

// <link rel="stylesheet" href="./assets/*.css"> -> <style>
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, (tag) => {
  const href = /href="([^"]+)"/i.exec(tag)?.[1]
  if (!href) return tag
  inlined.push(href)
  return `<style>\n${asset(href)}\n</style>`
})

// <script src="./assets/*.js"> -> inline module
html = html.replace(/<script\b[^>]*src="([^"]+)"[^>]*>\s*<\/script>/gi, (_tag, src) => {
  inlined.push(src)
  const js = asset(src)
    // These two sequences would derail the HTML parser inside an inline script.
    // Both replacements are inert to JavaScript: '\/' is '/' and '\x21' is '!' in
    // string literals AND in regex literals, so third-party code (SheetJS has four
    // /<!--.../ regexes) keeps its exact meaning.
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\x21--')
  return `<script type="module">\n${js}\n</script>`
})

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, html, 'utf8')

const kb = (n) => `${Math.round(n / 1024)} kB`
console.log(`inlined : ${inlined.join(', ')}`)
console.log(`written : ${outFile}`)
console.log(`size    : ${kb(statSync(outFile).size)}`)

const leftovers = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1])
if (leftovers.length) {
  console.error(`FAILED: still references external files: ${leftovers.join(', ')}`)
  process.exit(1)
}
console.log('check   : no external file references remain')
