import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CONTACT, PRICE } from '@/lib/kit'

const ROOT = new URL('../', import.meta.url).pathname

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const rel = join(dir, entry)
    if (statSync(join(ROOT, rel)).isDirectory()) sourceFiles(rel, out)
    else if (/\.(tsx?|md)$/.test(entry)) out.push(rel)
  }
  return out
}

describe('nothing placeholder ships', () => {
  const files = ['app', 'components', 'lib'].flatMap((d) => sourceFiles(d))

  it('has real contact details', () => {
    expect(CONTACT.entity).toBe('Pebble Robo')
    expect(CONTACT.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i)
    expect(CONTACT.email).not.toMatch(/example\.com$/)
  })

  it('leaves no REPLACE / TODO / TBD marker anywhere in the site source', () => {
    const offenders: string[] = []
    for (const f of files) {
      const text = readFileSync(join(ROOT, f), 'utf8')
      for (const m of text.matchAll(/\b(REPLACE[- ]ME|REPLACE —|TODO|TBD|FIXME|XXX)\b/g)) {
        offenders.push(`${f}: ${m[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('never references example.com in customer-facing source', () => {
    const offenders = files.filter((f) =>
      readFileSync(join(ROOT, f), 'utf8').includes('example.com'))
    expect(offenders).toEqual([])
  })

  it('states one price, consistently', () => {
    expect(PRICE.now).toBe('₹11,999')
    expect(PRICE.mrp).toBe('₹16,999')
  })
})
