import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const pem = fs
  .readFileSync(path.join(process.cwd(), process.env.TREEZ_PRIVATE_KEY_FILE), "utf8")
  .trim()
const certId = process.env.TREEZ_CERT_ID
const orgId = process.env.TREEZ_ORG_ID
const d = process.env.TREEZ_DISPENSARY
const base = "https://api-prod.treez.io"

function enc(o) {
  return Buffer.from(JSON.stringify(o))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

async function get(qs) {
  const url =
    `${base}/dispensary/v3/${encodeURIComponent(d)}/discount/all` + (qs ? `?${qs}` : "")
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
  const r = await fetch(url, { headers: { Authorization: `${sh}.${sig}` } })
  const j = await r.json()
  const disc = j.data?.discounts || []
  return {
    qs: qs || "(none)",
    status: r.status,
    n: disc.length,
    first: disc[0]?.discount_title,
    total: j.data?.total_elements,
  }
}

const queries = [
  "",
  "page=0",
  "page=1",
  "page=2",
  "offset=50",
  "start_index=50",
  "page_number=1",
  "pageSize=50&page=1",
  "page_index=1",
  "cursor=1",
]

for (const qs of queries) {
  try {
    console.log(await get(qs))
  } catch (e) {
    console.log({ qs, err: String(e) })
  }
}
