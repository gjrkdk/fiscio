import { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthContext = {
  session: Session | null
  laden: boolean
}

const AuthCtx = createContext<AuthContext>({ session: null, laden: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    // Haal huidige sessie op (uit AsyncStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLaden(false)
    })

    // Luister naar auth-wijzigingen (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLaden(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthCtx.Provider value={{ session, laden }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
