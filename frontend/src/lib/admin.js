/** E-mail do administrador (curadoria / importar arquivo). */
export const ADMIN_EMAIL = 'alanadcms@gmail.com'

export function isAdminUser(user) {
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL)
}
