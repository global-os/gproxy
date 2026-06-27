export const ADMIN_EMAIL = 'peterson@sent.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL
}