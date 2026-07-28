import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useMisModulos, type ModuloVisible } from '@/hooks/useMisModulos'
import { useAuthContext } from '@/context/AuthContext'

interface ModulosContextValue {
  modulos: ModuloVisible[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ModulosContext = createContext<ModulosContextValue | null>(null)

export function ModulosProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext()
  const { modulos, loading: modulosLoading, error, refetch, clear } = useMisModulos()

  useEffect(() => {
    if (authLoading) return
    if (user) {
      refetch()
    } else {
      clear()
    }
  }, [user?.id, authLoading, refetch, clear])

  return (
    <ModulosContext.Provider value={{
      modulos,
      loading: authLoading || modulosLoading,
      error,
      refetch,
    }}>
      {children}
    </ModulosContext.Provider>
  )
}

export function useModulosContext(): ModulosContextValue {
  const ctx = useContext(ModulosContext)
  if (!ctx) throw new Error('useModulosContext debe usarse dentro de ModulosProvider')
  return ctx
}
