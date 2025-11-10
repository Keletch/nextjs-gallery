'use client'
import { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'
import type { Session } from '@supabase/supabase-js'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession()
      setSession(data.session)
    }
    getSession()
  }, [])

  const handleLogin = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/moderate`,
      },
    })
    if (error) console.error('Error al iniciar sesión:', error.message)
  }

  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut()
    if (error) console.error('Error al cerrar sesión:', error.message)
    window.location.href = '/moderate'
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h2>No has iniciado sesión</h2>
        <button
          onClick={handleLogin}
          style={{ backgroundColor: 'green', color: 'white', padding: '0.5rem 1rem' }}
        >
          Iniciar sesión con Google
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={async () => {
            if (window.confirm('¿Seguro que quieres cerrar sesión?')) await handleLogout()
          }}
          style={{ backgroundColor: 'red', color: 'white', padding: '0.5rem 1rem' }}
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  )
}