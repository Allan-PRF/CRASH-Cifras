import { LoginPage } from './LoginPage'

/** Cadastro com código de indicação já salvo em sessionStorage. */
export function CadastroPage() {
  return <LoginPage initialMode="signup" />
}
