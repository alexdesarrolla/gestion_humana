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