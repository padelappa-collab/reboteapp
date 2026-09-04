import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { GuestRoute, OnboardingRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import ProfileSetupPage from '@/features/auth/ProfileSetupPage'
import SignUpPage from '@/features/auth/SignUpPage'
import BoardPage from '@/features/board/BoardPage'
import SocialPage from '@/features/feed/SocialPage'
import PlayerPage from '@/features/feed/PlayerPage'
import BoardPostPage from '@/features/board/BoardPostPage'
import CourtsPage from '@/features/courts/CourtsPage'
import CreateMatchPage from '@/features/matches/CreateMatchPage'
import MatchDetailPage from '@/features/matches/MatchDetailPage'
import MatchesListPage from '@/features/matches/MatchesListPage'
import PrivacyPage from '@/features/legal/PrivacyPage'
import TermsPage from '@/features/legal/TermsPage'
import ProfilePage from '@/features/profile/ProfilePage'
import RankingPage from '@/features/ranking/RankingPage'

export const router = createBrowserRouter([
  // públicas: Google y las tiendas las exigen accesibles sin sesión
  { path: '/privacidad', element: <PrivacyPage /> },
  { path: '/terminos', element: <TermsPage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/registro', element: <SignUpPage /> },
    ],
  },
  {
    element: <OnboardingRoute />,
    children: [{ path: '/perfil/nuevo', element: <ProfileSetupPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <SocialPage /> },
          { path: '/social', element: <SocialPage /> },
          // el nombre viejo sigue funcionando por si quedó algún enlace
          { path: '/feed', element: <SocialPage /> },
          { path: '/jugador/:id', element: <PlayerPage /> },
          { path: '/partidos', element: <MatchesListPage /> },
          { path: '/partidos/nuevo', element: <CreateMatchPage /> },
          { path: '/partidos/:id', element: <MatchDetailPage /> },
          { path: '/ranking', element: <RankingPage /> },
          { path: '/tablon', element: <BoardPage /> },
          { path: '/tablon/:id', element: <BoardPostPage /> },
          { path: '/canchas', element: <CourtsPage /> },
          { path: '/perfil', element: <ProfilePage /> },
        ],
      },
    ],
  },
])
