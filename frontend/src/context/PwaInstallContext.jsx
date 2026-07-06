import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  isPwaInstalled,
  recordBannerDismiss,
  shouldShowAutoBanner,
  supportsManualInstall,
} from '../lib/pwaInstall'

const PwaInstallContext = createContext(null)

export function PwaInstallProvider({ children }) {
  const [installed, setInstalled] = useState(() => isPwaInstalled())
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [iosHintOpen, setIosHintOpen] = useState(false)
  const [bannerEligible, setBannerEligible] = useState(() => shouldShowAutoBanner())

  const refreshInstalled = useCallback(() => {
    setInstalled(isPwaInstalled())
  }, [])

  const refreshBannerSchedule = useCallback(() => {
    setBannerEligible(shouldShowAutoBanner())
  }, [])

  useEffect(() => {
    function onBeforeInstall(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    function onAppInstalled() {
      setDeferredPrompt(null)
      setInstalled(true)
      setBannerEligible(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    const standaloneMq = window.matchMedia('(display-mode: standalone)')
    const fullscreenMq = window.matchMedia('(display-mode: fullscreen)')
    const onDisplayModeChange = () => refreshInstalled()

    standaloneMq.addEventListener('change', onDisplayModeChange)
    fullscreenMq.addEventListener('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      standaloneMq.removeEventListener('change', onDisplayModeChange)
      fullscreenMq.removeEventListener('change', onDisplayModeChange)
    }
  }, [refreshInstalled])

  const canNativeInstall = deferredPrompt != null
  const canManualInstall = supportsManualInstall()
  const showInstallButton = !installed && (canNativeInstall || canManualInstall)
  const showAutoBanner = showInstallButton && bannerEligible

  const promptInstall = useCallback(async () => {
    if (installed) return

    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setInstalled(true)
        setBannerEligible(false)
      }
      return
    }

    if (canManualInstall) {
      setIosHintOpen(true)
    }
  }, [canManualInstall, deferredPrompt, installed])

  const dismissAutoBanner = useCallback(() => {
    recordBannerDismiss()
    refreshBannerSchedule()
  }, [refreshBannerSchedule])

  const closeIosHint = useCallback(() => {
    setIosHintOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      installed,
      showInstallButton,
      showAutoBanner,
      iosHintOpen,
      promptInstall,
      dismissAutoBanner,
      closeIosHint,
      canNativeInstall,
      canManualInstall,
    }),
    [
      installed,
      showInstallButton,
      showAutoBanner,
      iosHintOpen,
      promptInstall,
      dismissAutoBanner,
      closeIosHint,
      canNativeInstall,
      canManualInstall,
    ],
  )

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  )
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext)
  if (!ctx) {
    throw new Error('usePwaInstall deve ser usado dentro de PwaInstallProvider')
  }
  return ctx
}
