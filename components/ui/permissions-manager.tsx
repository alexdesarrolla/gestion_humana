import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

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
}

interface PermisoModulo {
  modulo_id: string
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}

interface PermissionsManagerProps {
  usuarioId: string
  onPermissionsChange: (permisos: PermisoModulo[]) => void
  disabled?: boolean
}

export function PermissionsManager({ usuarioId, onPermissionsChange, disabled = false }: PermissionsManagerProps) {
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [permisos, setPermisos] = useState<{ [key: string]: PermisoModulo }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadModulosAndPermisos()
  }, [usuarioId])

  useEffect(() => {
    // Notificar cambios en permisos al componente padre
    const permisosArray = Object.values(permisos).filter(p => 
      p.puede_ver || p.puede_crear || p.puede_editar || p.puede_eliminar
    )
    onPermissionsChange(permisosArray)
  }, [permisos, onPermissionsChange])

  const loadModulosAndPermisos = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar todos los módulos activos
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos')
        .select('*')
        .eq('activo', true)
        .order('orden')

      if (modulosError) {
        throw new Error('Error al cargar módulos')
      }

      setModulos(modulosData || [])

      // Cargar permisos existentes del usuario
      const { data: permisosData, error: permisosError } = await supabase
        .from('usuario_permisos')
        .select('modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar')
        .eq('usuario_id', usuarioId)

      if (permisosError) {
        throw new Error('Error al cargar permisos')
      }

      // Crear objeto de permisos indexado por modulo_id
      const permisosMap: { [key: string]: PermisoModulo } = {}
      
      // Inicializar todos los módulos con permisos en false
      modulosData?.forEach(modulo => {
        permisosMap[modulo.id] = {
          modulo_id: modulo.id,
          puede_ver: false,
          puede_crear: false,
          puede_editar: false,
          puede_eliminar: false
        }
      })

      // Aplicar permisos existentes
      permisosData?.forEach(permiso => {
        permisosMap[permiso.modulo_id] = {
          modulo_id: permiso.modulo_id,
          puede_ver: permiso.puede_ver,
          puede_crear: permiso.puede_crear,
          puede_editar: permiso.puede_editar,
          puede_eliminar: permiso.puede_eliminar
        }
      })

      setPermisos(permisosMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const updatePermiso = (moduloId: string, campo: keyof Omit<PermisoModulo, 'modulo_id'>, valor: boolean) => {
    if (disabled) return

    setPermisos(prev => {
      const nuevoPermiso = { ...prev[moduloId] }
      nuevoPermiso[campo] = valor

      return {
        ...prev,
        [moduloId]: nuevoPermiso
      }
    })
  }

  const toggleAllPermissions = (moduloId: string, enable: boolean) => {
    if (disabled) return

    setPermisos(prev => ({
      ...prev,
      [moduloId]: {
        modulo_id: moduloId,
        puede_ver: enable,
        puede_crear: enable,
        puede_editar: enable,
        puede_eliminar: enable
      }
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Info className="h-4 w-4 text-blue-500" />
        <p className="text-sm text-gray-600">
          Selecciona los módulos y permisos que tendrá este usuario.
        </p>
      </div>

      <div className="grid gap-4">
        {modulos.map((modulo) => {
          const permisoModulo = permisos[modulo.id]
          const tieneAlgunPermiso = permisoModulo && (
            permisoModulo.puede_ver || 
            permisoModulo.puede_crear || 
            permisoModulo.puede_editar || 
            permisoModulo.puede_eliminar
          )

          return (
            <Card key={modulo.id} className={`transition-all ${tieneAlgunPermiso ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {modulo.nombre}
                      {tieneAlgunPermiso && <Badge variant="secondary" className="text-xs">Activo</Badge>}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {modulo.descripcion}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAllPermissions(modulo.id, true)}
                      disabled={disabled}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllPermissions(modulo.id, false)}
                      disabled={disabled}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${modulo.id}-ver`}
                      checked={permisoModulo?.puede_ver || false}
                      onChange={(e) => 
                        updatePermiso(modulo.id, 'puede_ver', e.target.checked)
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`${modulo.id}-ver`} className="text-sm font-medium">
                      Ver
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${modulo.id}-crear`}
                      checked={permisoModulo?.puede_crear || false}
                      onChange={(e) => 
                        updatePermiso(modulo.id, 'puede_crear', e.target.checked)
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`${modulo.id}-crear`} className="text-sm font-medium">
                      Crear
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${modulo.id}-editar`}
                      checked={permisoModulo?.puede_editar || false}
                      onChange={(e) => 
                        updatePermiso(modulo.id, 'puede_editar', e.target.checked)
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`${modulo.id}-editar`} className="text-sm font-medium">
                      Editar
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${modulo.id}-eliminar`}
                      checked={permisoModulo?.puede_eliminar || false}
                      onChange={(e) => 
                        updatePermiso(modulo.id, 'puede_eliminar', e.target.checked)
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`${modulo.id}-eliminar`} className="text-sm font-medium">
                      Eliminar
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export type { PermisoModulo }