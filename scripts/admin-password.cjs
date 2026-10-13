// Prompts privately; only the derived hash is printed. Never store the password in Git.
const crypto = require('node:crypto')
const readline = require('node:readline')
if (!process.stdin.isTTY) { console.error('Run this command in an interactive terminal.'); process.exit(1) }
process.stdout.write('Admin password (at least 12 characters): ')
readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)
let password = ''
process.stdin.on('keypress', (text, key) => {
  if (key?.ctrl && key.name === 'c') process.exit(1)
  if (key?.name === 'return') {
    process.stdin.setRawMode(false)
    if (password.length < 12) { console.error('\nUse at least 12 characters.'); process.exit(1) }
    const salt = crypto.randomBytes(24).toString('hex')
    const derived = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
    process.stdout.write(`\nADMIN_PASSWORD_HASH=${salt}:${derived}\n`)
    process.exit(0)
  } else if (key?.name === 'backspace') password = password.slice(0, -1)
  else if (text && !key?.ctrl) password += text
})
