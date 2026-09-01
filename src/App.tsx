import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { router } from '@/router'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </AuthProvider>
  )
}
