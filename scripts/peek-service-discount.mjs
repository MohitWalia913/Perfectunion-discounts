import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const pem = fs
  .readFileSync(path.join(process.cwd(), process.env.TREEZ_PRIVATE_KEY_FILE), "utf8")
  .trim()
const certId = process.env.TREEZ_CERT_ID
const orgId = process.env.TREEZ_ORG_ID
const base = "https://api-prod.treez.io"
const url = `${base}/service/discount/v3/discount`

function enc(o) {
  return Buffer.from(JSON.stringify(o))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

const now = Date.now()
const h = {
  aud: url,
  iss: certId,
  oid: orgId,
  iat: now,
  exp: now + 30_000,
  jti: crypto.randomUUID(),
}
const sh = enc(h)
const sig = crypto.createSign("RSA-SHA256").update(sh).sign(pem, "base64url")
const res = await fetch(url, { headers: { Authorization: `${sh}.${sig}`, Accept: "application/json" } })
const text = await res.text()
console.log("status", res.status)
console.log(text.slice(0, 1500))
