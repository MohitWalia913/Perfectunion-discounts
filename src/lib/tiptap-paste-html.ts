/**
 * Sanitize HTML pasted from Google Docs / Microsoft Word for TipTap/ProseMirror.
 * Keeps tables, lists, images, links, and inline styles where possible; strips Office cruft.
 */

function cleanupStringPhase(html: string): string {
  let h = html

  const bodyMatch = h.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) h = bodyMatch[1] ?? h

  h = h.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, "")
  h = h.replace(/<!--[\s\S]*?-->/g, "")
  h = h.replace(/<\?xml[\s\S]*?\?>/gi, "")
  h = h.replace(/<xml>[\s\S]*?<\/xml>/gi, "")
  h = h.replace(/<style[\s\S]*?<\/style>/gi, "")
  h = h.replace(/<meta[^>]*>/gi, "")
  h = h.replace(/<link[^>]*>/gi, "")

  h = h.replace(/<\s*b\b(?=[\s>])/gi, "<strong")
  h = h.replace(/<\/\s*b\s*>/gi, "</strong>")
  h = h.replace(/<\s*i\b(?=[\s>])/gi, "<em")
  h = h.replace(/<\/\s*i\s*>/gi, "</em>")
  h = h.replace(/<\s*u\b(?=[\s>])/gi, "<u")
  h = h.replace(/<\/\s*u\s*>/gi, "</u>")

  h = h.replace(/<\/?o:p[^>]*>/gi, "")
  h = h.replace(/<\/?w:[^>]*>/gi, "")
  h = h.replace(/<\/?v:[^>]*>/gi, "")

  return h
}

function cleanStyleAttribute(value: string): string | null {
  const parts = value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((prop) => {
      const low = prop.toLowerCase()
      if (/^mso-/.test(low)) return false
      if (low.startsWith("tab-stops")) return false
      if (low.startsWith("line-height") && low.includes("mso")) return false
      return true
    })
  if (!parts.length) return null
  return parts.join("; ")
}

/**
 * DOM-based pass: strip classes/attrs that break semantic output; trim Word styles.
 */
function domCleanup(html: string): string {
  if (typeof DOMParser === "undefined") return html

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, "text/html")
  } catch {
    return html
  }

  const { body } = doc
  body.querySelectorAll("style, meta, link, script, xml").forEach((el) => el.remove())

  const tree = body.querySelectorAll("*")
  tree.forEach((el) => {
    const tag = el.tagName.toLowerCase()

    el.removeAttribute("lang")
    el.removeAttribute("xml:lang")

    if (tag === "span" && !el.attributes.length && el.textContent === "") {
      el.remove()
      return
    }

    if (el.hasAttribute("class")) {
      const keep = [...el.classList].filter((c) => !c.startsWith("Mso") && !c.startsWith("SCXW") && !c.startsWith("BCX"))
      el.removeAttribute("class")
      if (keep.length) el.className = keep.join(" ")
    }

    const st = el.getAttribute("style")
    if (st) {
      const cleaned = cleanStyleAttribute(st)
      if (cleaned) el.setAttribute("style", cleaned)
      else el.removeAttribute("style")
    }

    if (tag === "img") {
      const src = el.getAttribute("src")?.trim() ?? ""
      if (!src || src.startsWith("file:")) {
        el.remove()
        return
      }
    }

    const name = el.getAttribute("name")
    if (name === "_Toc" || name === "_GoBack") el.removeAttribute("name")
  })

  body.querySelectorAll("colgroup").forEach((cg) => {
    const table = cg.closest("table")
    if (table && table.querySelector("tbody, thead, tr")) cg.remove()
  })

  return body.innerHTML
}

/**
 * Public: full pipeline for TipTap `transformPastedHTML`.
 */
export function sanitizeRichPasteHtml(html: string): string {
  if (!html || !html.trim()) return html
  const phase1 = cleanupStringPhase(html)
  return domCleanup(phase1)
}
