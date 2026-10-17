const { generateKeyPairSync } = require('node:crypto')

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
console.log('Add these as Cloudflare Pages secrets. Copy the entire one-line JSON values; never commit the private key.')
console.log(`HUB_LICENSE_SIGNING_PRIVATE_JWK=${JSON.stringify(privateKey.export({ format: 'jwk' }))}`)
console.log(`HUB_LICENSE_VERIFY_PUBLIC_JWK=${JSON.stringify(publicKey.export({ format: 'jwk' }))}`)
