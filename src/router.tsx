import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { GuestRoute, OnboardingRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import ProfileSetupPage from '@/features/auth/ProfileSetupPage'
import SignUpPage from '@/features/auth/SignUpPage'
import ProfilePage from '@/features/profile/ProfilePage'

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
          // la portada será el feed cuando exista; por ahora, el perfil
          { path: '/', element: <ProfilePage /> },
          { path: '/perfil', element: <ProfilePage /> },
        ],
      },
    ],
  },
])
