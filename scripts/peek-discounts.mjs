/**
 * Debug: print Treez discount response shape (run from project root).
 * Usage: node --env-file=.env.local scripts/peek-discounts.mjs
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

const fromFile = process.env.TREEZ_PRIVATE_KEY_FILE?.trim()
let pem
if (fromFile) {
  const keyPath = path.isAbsolute(fromFile) ? fromFile : path.join(process.cwd(), fromFile)
  pem = fs.readFileSync(keyPath, "utf8").trim()
} else {
  pem = process.env.TREEZ_PRIVATE_KEY?.replace(/\\n/g, "\n")?.trim()
}

const certId = process.env.TREEZ_CERT_ID
const orgId = process.env.TREEZ_ORG_ID
const dispensary = process.env.TREEZ_DISPENSARY
const base = (process.env.TREEZ_API_BASE ?? "https://api-prod.treez.io").replace(/\/$/, "")
const url = `${base}/dispensary/v3/${encodeURIComponent(dispensary)}/discount/all`

const now = Date.now()
const header = {
  aud: url,
  iss: certId,
  oid: orgId,
  iat: now,
  exp: now + 30_000,
  jti: crypto.randomUUID(),
}
const strHeader = base64UrlEncode(header)
const signer = crypto.createSign("RSA-SHA256")
signer.update(strHeader)
signer.end()
const sig = signer.sign(pem, "base64url")
const auth = `${strHeader}.${sig}`

const res = await fetch(url, {
  method: "GET",
  headers: { Authorization: auth, Accept: "application/json" },
})
const text = await res.text()
let body
try {
  body = text ? JSON.parse(text) : null
} catch {
  body = { _nonJson: text.slice(0, 500) }
}

console.log("URL:", url)
console.log("Status:", res.status)
if (body && typeof body === "object" && !Array.isArray(body)) {
  console.log("Top-level keys:", Object.keys(body))
  for (const k of Object.keys(body)) {
    const v = body[k]
    console.log(`  [${k}]:`, Array.isArray(v) ? `array(len=${v.length})` : typeof v)
  }
} else {
  console.log("Body type:", Array.isArray(body) ? `array(len=${body?.length})` : typeof body)
}
console.log("Sample (truncated):", JSON.stringify(body).slice(0, 2000))
