import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface Modulo {
  id: string
  nombre: string
  descripcion: string
  ruta: string
  icono: string
  orden: number
  activo: boolean
}

interface UsuarioPermiso {
  id: string
  usuario_id: string
  modulo_id: string
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
  modulos: Modulo
}

interface UserData {
  id: string
  rol: 'usuario' | 'administrador'
  estado: 'activo' | 'inactivo'
}

export function usePermissions() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [permisos, setPermisos] = useState<UsuarioPermiso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserPermissions()
  }, [])

  const loadUserPermissions = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa')
      }

      // Obtener datos del usuario
      const { data: user, error: userError } = await supabase
        .from('usuario_nomina')
        .select('id, rol, estado')
        .eq('auth_user_id', session.user.id)
        .single()

      if (userError) {
        console.error('Error al obtener datos del usuario:', userError)
        throw new Error('Error al obtener datos del usuario')
      }

      setUserData(user)
      console.log('Usuario cargado:', user)

      // Si es administrador, tiene todos los permisos
      if (user.rol === 'administrador') {
        const { data: modulos, error: modulosError } = await supabase
          .from('modulos')
          .select('*')
          .eq('activo', true)
          .order('orden')

        if (modulosError) {
          console.error('Error al obtener módulos:', modulosError)
          throw new Error('Error al obtener módulos')
        }

        // Crear permisos completos para administrador
        const permisosAdmin = modulos.map(modulo => ({
          id: `admin-${modulo.id}`,
          usuario_id: session.user.id,
          modulo_id: modulo.id,
          puede_ver: true,
          puede_crear: true,
          puede_editar: true,
          puede_eliminar: true,
          modulos: modulo
        }))

        setPermisos(permisosAdmin)
      } else {
        // Para usuarios, obtener permisos específicos
        const { data: userPermisos, error: permisosError } = await supabase
          .from('usuario_permisos')
          .select(`
            *,
            modulos (
              id,
              nombre,
              descripcion,
              ruta,
              icono,
              orden,
              activo
            )
          `)
          .eq('usuario_id', session.user.id)
          .eq('modulos.activo', true)
          .order('modulos.orden', { foreignTable: 'modulos' })

        if (permisosError) {
          console.error('Error al obtener permisos:', permisosError)
          throw new Error('Error al obtener permisos del usuario')
        }

        console.log('Permisos cargados:', userPermisos)
        setPermisos(userPermisos || [])
      }
    } catch (err) {
      console.error('Error en loadUserPermissions:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Función para verificar si el usuario puede acceder a una ruta
  const canAccess = (ruta: string): boolean => {
    if (!userData) return false
    
    // Los administradores pueden acceder a todo
    if (userData.rol === 'administrador') return true
    
    // Verificar si el usuario tiene permisos para esta ruta
    return permisos.some(permiso => 
      permiso.modulos.ruta === ruta && permiso.puede_ver
    )
  }

  // Función para verificar permisos específicos
  const hasPermission = (moduloRuta: string, accion: 'ver' | 'crear' | 'editar' | 'eliminar'): boolean => {
    if (!userData) return false
    
    // Los administradores tienen todos los permisos
    if (userData.rol === 'administrador') return true
    
    const permiso = permisos.find(p => p.modulos.ruta === moduloRuta)
    if (!permiso) return false
    
    switch (accion) {
      case 'ver': return permiso.puede_ver
      case 'crear': return permiso.puede_crear
      case 'editar': return permiso.puede_editar
      case 'eliminar': return permiso.puede_eliminar
      default: return false
    }
  }

  // Función para verificar si es administrador
  const isAdministrator = (): boolean => {
    return userData?.rol === 'administrador'
  }

  // Función para verificar si es administrador
  const isAdmin = (): boolean => {
    return userData?.rol === 'administrador'
  }

  // Función para obtener módulos accesibles
  const getAccessibleModules = (): Modulo[] => {
    if (!userData) return []
    
    if (userData.rol === 'administrador') {
      // Para administradores, devolver todos los módulos de sus permisos
      return permisos.map(p => p.modulos)
    }
    
    // Para otros usuarios, devolver solo módulos con permiso de ver
    return permisos
      .filter(p => p.puede_ver)
      .map(p => p.modulos)
  }

  // Función para refrescar permisos
  const refreshPermissions = () => {
    loadUserPermissions()
  }

  return {
    userData,
    permisos,
    loading,
    error,
    canAccess,
    hasPermission,
    isAdministrator,
    isAdmin,
    getAccessibleModules,
    refreshPermissions
  }
}