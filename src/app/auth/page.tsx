import { redirect } from "next/navigation"

/** Legacy URL — canonical login is `/login`. */
export default function AuthRedirectPage() {
  redirect("/login")
}
