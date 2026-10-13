import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const directory = new URL('../../.local/https/', import.meta.url)
mkdirSync(directory, { recursive: true })
execFileSync(
  'dotnet',
  [
    'dev-certs',
    'https',
    '--export-path',
    fileURLToPath(new URL('localhost.pem', directory)),
    '--format',
    'Pem',
    '--no-password',
  ],
  { stdio: 'inherit' },
)
