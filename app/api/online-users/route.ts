import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// POST - Enviar heartbeat (actualizar estado en línea)
export async function POST(request: NextRequest) {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente con el token del usuario autenticado
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Verificar el token y obtener el usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Error de autenticación:', authError)
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Hacer upsert del heartbeat con el cliente autenticado
    const { error: upsertError } = await supabase
      .from('online_users')
      .upsert(
        {
          user_id: user.id,
          last_seen_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id'
        }
      )

    if (upsertError) {
      console.error('Error al actualizar heartbeat:', upsertError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en heartbeat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// GET - Obtener cantidad de usuarios en línea
export async function GET(request: NextRequest) {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente con el token del usuario autenticado
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Verificar el token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Error de autenticación en GET:', authError)
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Limpiar usuarios inactivos (más de 2 minutos sin heartbeat) usando service role
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const twoMinutesAgoCleanup = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    await adminSupabase
      .from('online_users')
      .delete()
      .lt('last_seen_at', twoMinutesAgoCleanup)

    // Obtener usuarios en línea (últimos 2 minutos)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    
    const { data: onlineUsers, error: queryError } = await supabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .gte('last_seen_at', twoMinutesAgo)
      .order('last_seen_at', { ascending: false })

    if (queryError) {
      console.error('Error al consultar usuarios en línea:', queryError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Obtener información adicional de los usuarios desde usuario_nomina
    const usersWithInfo = []
    if (onlineUsers && onlineUsers.length > 0) {
      for (const onlineUser of onlineUsers) {
        const { data: userData, error: userError } = await supabase
          .from('usuario_nomina')
          .select('colaborador, avatar_path')
          .eq('auth_user_id', onlineUser.user_id)
          .single()
        
        usersWithInfo.push({
          user_id: onlineUser.user_id,
          last_seen_at: onlineUser.last_seen_at,
          colaborador: userData?.colaborador || 'Usuario',
          avatar_path: userData?.avatar_path
        })
      }
    }

    const count = usersWithInfo.length

    return NextResponse.json({ 
      count,
      users: usersWithInfo,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error al obtener usuarios en línea:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}