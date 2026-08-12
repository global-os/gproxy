#!/usr/bin/env node
import { execSync } from 'child_process'

const ports = [3000, 3443, 5173]
for (const port of ports) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim()
    if (out) {
      console.log(`Killing PID ${out} on port ${port}`)
      execSync(`kill -9 ${out}`)
    }
  } catch { /* nothing on this port */ }
}
