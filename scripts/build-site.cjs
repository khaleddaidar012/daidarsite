const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32' && /\.cmd$/i.test(command),
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

run(npm, ['--prefix', 'matjari', 'ci', '--no-audit', '--no-fund'])
run(npm, ['--prefix', 'matjari', 'run', 'build'], {
  MATJARI_MOUNTED_IN_HUB: '1',
  VITE_MATJARI_HUB_INTEGRATED: '1',
})
const assetHash = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'public', 'matjari', 'assets', 'matjari.js')))
  .update(fs.readFileSync(path.join(root, 'public', 'matjari', 'assets', 'matjari.css')))
  .digest('hex')
  .slice(0, 16)
run(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build'], {
  MATJARI_ASSET_VERSION: assetHash,
})
