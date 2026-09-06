import { RouterProvider } from 'react-router-dom'
import { Splash } from '@/components/Splash'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { router } from '@/router'

export default function App() {
  return (
    <AuthProvider>
      {/* dentro del proveedor: necesita saber si la sesión ya contestó */}
      <Splash />
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </AuthProvider>
  )
}
