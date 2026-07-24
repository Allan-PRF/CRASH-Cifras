import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetwork =
      !error.response &&
      (error.isAxiosError === true ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error')

    const message = isNetwork
      ? import.meta.env.PROD
        ? 'Não foi possível conectar ao servidor. Tente novamente em alguns segundos.'
        : 'Não foi possível conectar à API. Na raiz do projeto, execute: npm run dev (frontend + backend).'
      : error.response?.data?.error ||
        error.message ||
        'Erro ao comunicar com o servidor'
    const err = new Error(message)
    if (error.response?.data?.code) {
      err.code = error.response.data.code
    }
    if (error.response?.data?.requer_confirmacao) {
      err.requer_confirmacao = true
    }
    if (error.response?.data?.entrada_encontrada) {
      err.entrada_encontrada = error.response.data.entrada_encontrada
    }
    if (error.response?.data?.copia) {
      err.copia = error.response.data.copia
    }
    if (error.response?.data?.requer_reativacao) {
      err.requer_reativacao = true
    }
    if (error.response?.data?.entrada_despublicada) {
      err.entrada_despublicada = error.response.data.entrada_despublicada
    }
    if (error.response?.data?.saidas) {
      err.saidas = error.response.data.saidas
    }
    return Promise.reject(err)
  },
)
