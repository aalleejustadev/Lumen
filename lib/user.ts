/**
 * The subset of the session user the chrome needs — header, sidebar, menus.
 * Kept out of the client components that use it so Server Components can call
 * `initialsOf` too; a `"use client"` module can't be invoked from the server.
 */
export type MenuUser = {
  name: string
  email: string
  image?: string | null
}

/**
 * Two letters from the display name, falling back to the address. Only ever
 * seen when the provider gave us no picture, or the picture fails to load.
 */
export function initialsOf(name: string, email: string) {
  const source = name.trim() || email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase()
}
