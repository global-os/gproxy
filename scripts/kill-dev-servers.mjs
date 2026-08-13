#!/usr/bin/env node
import { execSync } from 'child_process'

const ports = process.argv.slice(2).map(Number)
if (ports.length === 0) ports.push(3000, 3443, 443)
for (const port of ports) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim()
    if (out) {
      const pids = out.split(/\s+/)
      console.log(
        `Killing ${pids.length} PID(s) on port ${port}: ${pids.join(' ')}`
      )
      for (const pid of pids) execSync(`kill -9 ${pid}`)
    }
  } catch {
    /* nothing on this port */
  }
}
