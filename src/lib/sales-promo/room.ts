const PREFIX = "sales-promo:" as const

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function salesPromoRoomId(documentId: string): string {
  return `${PREFIX}${documentId}`
}

/** Returns document UUID when `room` matches our Liveblocks room pattern. */
export function parseSalesPromoRoomId(room: string): string | null {
  if (!room.startsWith(PREFIX)) return null
  const id = room.slice(PREFIX.length)
  return UUID_RE.test(id) ? id : null
}
