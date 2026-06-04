/** Design tokens — PRD §4.1 e teleprompter */
export const tema = {
  cores: {
    fundo: '#000000',
    fundoCard: '#111111',
    fundoRodape: '#0D0D0D',
    letra: '#FFFFFF',
    cifra: '#F97316',
    grau: '#67E8F9',
    textoSecundario: '#9CA3AF',
    borda: '#1F2937',
    primario: '#F97316',
    iniciarCulto: '#22C55E',
    versiculoTexto: '#E5E7EB',
  },
  teleprompter: {
    cifra: { fontSize: 24, fontWeight: 700 },
    letra: { fontSizeMin: 32, fontSizeMax: 56 },
    grau: { fontSize: 20, fontWeight: 400 },
    versiculo: { fontSize: 15 },
    palavra: { fontSize: 14 },
    barra: { fontSize: 13, fontWeight: 500 },
    rodapeAltura: 72,
  },
  fontes: {
    teleprompter: 'system-ui, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, Consolas, monospace',
  },
}

/** Variáveis CSS injetadas em :root */
export function aplicarTemaCss() {
  const root = document.documentElement
  const { cores } = tema
  root.style.setProperty('--crash-fundo', cores.fundo)
  root.style.setProperty('--crash-fundo-card', cores.fundoCard)
  root.style.setProperty('--crash-fundo-rodape', cores.fundoRodape)
  root.style.setProperty('--crash-letra', cores.letra)
  root.style.setProperty('--crash-cifra', cores.cifra)
  root.style.setProperty('--crash-grau', cores.grau)
  root.style.setProperty('--crash-texto-sec', cores.textoSecundario)
  root.style.setProperty('--crash-borda', cores.borda)
  root.style.setProperty('--crash-primario', cores.primario)
}
