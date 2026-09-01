import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { GuestRoute, OnboardingRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import ProfileSetupPage from '@/features/auth/ProfileSetupPage'
import SignUpPage from '@/features/auth/SignUpPage'
import CreateMatchPage from '@/features/matches/CreateMatchPage'
import MatchDetailPage from '@/features/matches/MatchDetailPage'
import MatchesListPage from '@/features/matches/MatchesListPage'
import ProfilePage from '@/features/profile/ProfilePage'
import RankingPage from '@/features/ranking/RankingPage'

export const router = createBrowserRouter([
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
          { path: '/', element: <MatchesListPage /> },
          { path: '/partidos', element: <MatchesListPage /> },
          { path: '/partidos/nuevo', element: <CreateMatchPage /> },
          { path: '/partidos/:id', element: <MatchDetailPage /> },
          { path: '/ranking', element: <RankingPage /> },
          { path: '/perfil', element: <ProfilePage /> },
        ],
      },
    ],
  },
])
