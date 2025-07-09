"use client"

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

interface OnlineUser {
  user_id: string
  last_seen_at: string
  colaborador?: string
  avatar_path?: string
}

interface OnlineUsersData {
  count: number
  users: OnlineUser[]
  timestamp: string
}

export function useOnlineUsers() {
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createSupabaseClient()

  // Función para enviar heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        return
      }

      const response = await fetch('/api/online-users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Error al enviar heartbeat:', response.statusText)
      }
    } catch (error) {
      console.error('Error al enviar heartbeat:', error)
    }
  }, [supabase])

  // Función para eliminar usuario cuando sale de la plataforma
  const removeUserOnline = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        return
      }

      // Usar sendBeacon si está disponible para mayor confiabilidad
      if (navigator.sendBeacon) {
        const data = new FormData()
        data.append('token', session.access_token)
        
        // Crear una URL con método DELETE simulado
        const url = new URL('/api/online-users', window.location.origin)
        url.searchParams.set('_method', 'DELETE')
        
        navigator.sendBeacon(url.toString(), data)
      } else {
        // Fallback con fetch
        await fetch('/api/online-users', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          keepalive: true
        })
      }
    } catch (error) {
      console.error('Error al eliminar usuario online:', error)
    }
  }, [supabase])

  // Función para obtener usuarios en línea
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/online-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data: OnlineUsersData = await response.json()
        setOnlineCount(data.count)
        setOnlineUsers(data.users)
        setError(null)
      } else {
        console.error('Error al obtener usuarios en línea:', response.statusText)
        setError('Error al obtener usuarios en línea')
      }
    } catch (error) {
      console.error('Error al obtener usuarios en línea:', error)
      setError('Error al obtener usuarios en línea')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Efecto para configurar heartbeat y polling
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout
    let fetchInterval: NodeJS.Timeout

    const startHeartbeat = async () => {
      // Enviar heartbeat inicial
      await sendHeartbeat()
      
      // Configurar intervalo de heartbeat cada 30 segundos
      heartbeatInterval = setInterval(sendHeartbeat, 30000)
    }

    const startFetching = async () => {
      // Obtener usuarios en línea inicial
      await fetchOnlineUsers()
      
      // Configurar intervalo para actualizar la lista cada 30 segundos
      fetchInterval = setInterval(fetchOnlineUsers, 30000)
    }

    // Verificar si hay sesión activa
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        startHeartbeat()
        startFetching()
      } else {
        setLoading(false)
      }
    }

    checkSession()

    // Limpiar intervalos al desmontar
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (fetchInterval) {
        clearInterval(fetchInterval)
      }
    }
  }, [sendHeartbeat, fetchOnlineUsers, supabase])

  // Efecto para manejar la salida del usuario de la plataforma
  useEffect(() => {
    const handleBeforeUnload = () => {
      removeUserOnline()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        removeUserOnline()
      }
    }

    const handlePageHide = () => {
      removeUserOnline()
    }

    // Agregar event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    // Limpiar event listeners al desmontar
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [removeUserOnline])

  // Suscripción a cambios en tiempo real (opcional)
  useEffect(() => {
    const channel = supabase
      .channel('online-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_users'
        },
        () => {
          // Actualizar la lista cuando hay cambios
          fetchOnlineUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchOnlineUsers])

  return {
    onlineCount,
    onlineUsers,
    loading,
    error,
    refresh: fetchOnlineUsers
  }
}