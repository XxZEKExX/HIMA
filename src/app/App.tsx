import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { router } from './routes'
import { AuthProvider } from '@/context/AuthContext'
import { ModulosProvider } from '@/context/ModulosContext'

export default function App() {
  return (
    <AuthProvider>
      <ModulosProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </ModulosProvider>
    </AuthProvider>
  )
}
