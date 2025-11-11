'use client'
import { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'
import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import styles from './ModeratePage.module.css'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()

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
      <div className={styles.container}>
        <h2 className={styles.heading}>No has iniciado sesión</h2>
        <button
          onClick={handleLogin}
          className={`${styles.button} ${styles.loginButton}`}
        >
          Iniciar sesión con Google
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button
          onClick={async () => {
            if (window.confirm('¿Seguro que quieres cerrar sesión?')) {
              await handleLogout()
            }
          }}
          className={`${styles.button} ${styles.logoutButton}`}
        >
          Logout
        </button>
        <button
          onClick={() => router.push('/gallery')}
          className={`${styles.button} ${styles.galleryButton}`}
        >
          Ir a galería
        </button>
      </div>

      {children}
    </div>
  )
}