import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PlanoGate } from '../components/assinatura/PlanoGate'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AccountPage } from '../pages/AccountPage'
import { Assinatura } from '../pages/Assinatura'
import { AssinaturaErro } from '../pages/AssinaturaErro'
import { AssinaturaSucesso } from '../pages/AssinaturaSucesso'
import { Historico } from '../pages/Historico'
import { Home } from '../pages/Home'
import { Importar } from '../pages/Importar'
import { LoginPage } from '../pages/LoginPage'
import { Ministro } from '../pages/Ministro'
import { Musica } from '../pages/Musica'
import { MusicaEditar } from '../pages/MusicaEditar'
import { MusicaNova } from '../pages/MusicaNova'
import { NotFoundPage } from '../pages/NotFoundPage'
import { Playlist } from '../pages/Playlist'
import { Playlists } from '../pages/Playlists'
import { PreviewArranjo } from '../pages/PreviewArranjo'
import { RevisaoVersiculos } from '../pages/RevisaoVersiculos'
import { AcessoNegado } from '../pages/AcessoNegado'
import { RastreioBot } from '../pages/RastreioBot'
import { Teleprompter } from '../pages/Teleprompter'
import { ReferralLanding } from '../pages/ReferralLanding'
import { AuthCallback } from '../pages/AuthCallback'
import { CadastroPage } from '../pages/CadastroPage'
import { AdminNovidades } from '../pages/AdminNovidades'
import { AdminRoute } from '../components/AdminRoute'

export const router = createBrowserRouter([
  { path: '/ref/:codigo', element: <ReferralLanding /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: 'ministro/:id',
        element: (
          <ProtectedRoute>
            <Ministro />
          </ProtectedRoute>
        ),
      },
      {
        path: 'ministro/:ministroId/musica/nova',
        element: (
          <ProtectedRoute>
            <MusicaNova />
          </ProtectedRoute>
        ),
      },
      {
        path: 'importar',
        element: (
          <ProtectedRoute>
            <PlanoGate minimo="solo">
              <Importar />
            </PlanoGate>
          </ProtectedRoute>
        ),
      },
      {
        path: 'musica/:id',
        element: (
          <ProtectedRoute>
            <Musica />
          </ProtectedRoute>
        ),
      },
      {
        path: 'musica/:id/editar',
        element: (
          <ProtectedRoute>
            <MusicaEditar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teleprompter/musica/:musicaId',
        element: (
          <ProtectedRoute>
            <Teleprompter />
          </ProtectedRoute>
        ),
      },
      {
        path: 'playlist',
        element: (
          <ProtectedRoute>
            <PlanoGate minimo="solo">
              <Playlists />
            </PlanoGate>
          </ProtectedRoute>
        ),
      },
      {
        path: 'playlist/:id',
        element: (
          <ProtectedRoute>
            <PlanoGate minimo="solo">
              <Playlist />
            </PlanoGate>
          </ProtectedRoute>
        ),
      },
      {
        path: 'playlist/:id/preview',
        element: (
          <ProtectedRoute>
            <PlanoGate minimo="solo">
              <PreviewArranjo />
            </PlanoGate>
          </ProtectedRoute>
        ),
      },
      {
        path: 'playlist/:id/versiculos',
        element: (
          <ProtectedRoute>
            <PlanoGate minimo="solo">
              <RevisaoVersiculos />
            </PlanoGate>
          </ProtectedRoute>
        ),
      },
      {
        path: 'historico',
        element: (
          <ProtectedRoute>
            <Historico />
          </ProtectedRoute>
        ),
      },
      {
        path: 'configuracoes',
        element: <Navigate to="/conta" replace />,
      },
      {
        path: 'assinatura',
        element: (
          <ProtectedRoute>
            <Assinatura />
          </ProtectedRoute>
        ),
      },
      {
        path: 'assinatura/sucesso',
        element: (
          <ProtectedRoute>
            <AssinaturaSucesso />
          </ProtectedRoute>
        ),
      },
      {
        path: 'assinatura/erro',
        element: (
          <ProtectedRoute>
            <AssinaturaErro />
          </ProtectedRoute>
        ),
      },
      {
        path: 'conta',
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/novidades',
        element: (
          <ProtectedRoute>
            <AdminRoute>
              <AdminNovidades />
            </AdminRoute>
          </ProtectedRoute>
        ),
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'cadastro', element: <CadastroPage /> },
      { path: 'auth/callback', element: <AuthCallback /> },
      { path: 'acesso-negado', element: <AcessoNegado /> },
      { path: 'rastreio-bot', element: <RastreioBot /> },
      {
        path: '*',
        element: (
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])
