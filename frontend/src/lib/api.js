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
      ? 'Não foi possível conectar à API. Na raiz do projeto, execute: npm run dev (frontend + backend).'
      : error.response?.data?.error ||
        error.message ||
        'Erro ao comunicar com o servidor'
    return Promise.reject(new Error(message))
  },
)
