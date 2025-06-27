"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { ProfileCard } from "@/components/ui/profile-card"
import { Skeleton } from "@/components/ui/skeleton"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { FaUser, FaBuilding, FaUserCheck, FaUserTimes, FaUmbrellaBeach } from 'react-icons/fa';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Administracion() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [solicitudesCertificacion, setSolicitudesCertificacion] = useState<any[]>([])
  const [solicitudesVacaciones, setSolicitudesVacaciones] = useState<any[]>([])
  const [solicitudesPermisos, setSolicitudesPermisos] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    vacationUsers: 0,
    totalCompanies: 0
  })
  const [notificacionesIncapacidades, setNotificacionesIncapacidades] = useState<any[]>([])

  // Función para cargar solicitudes de vacaciones
  const loadSolicitudesVacaciones = async () => {
    const supabase = createSupabaseClient()
    const { data: solicitudesVacacionesData } = await supabase
      .from('solicitudes_vacaciones')
      .select(`
        id,
        usuario_id,
        estado,
        fecha_inicio,
        fecha_fin,
        fecha_solicitud
      `)
      .eq('estado', 'pendiente')
      .order('fecha_solicitud', { ascending: false })
      .limit(5)

    if (solicitudesVacacionesData && solicitudesVacacionesData.length > 0) {
      const vacacionesUserIds = solicitudesVacacionesData.map(s => s.usuario_id)
      const { data: vacacionesUsuariosData } = await supabase
        .from('usuario_nomina')
        .select(`
          auth_user_id,
          colaborador,
          cedula,
          cargo_id,
          empresa_id,
          empresas:empresa_id(nombre),
          cargos:cargo_id(nombre)
        `)
        .in('auth_user_id', vacacionesUserIds)

      const solicitudesVacacionesCompletas = solicitudesVacacionesData.map(s => {
        const usuario = vacacionesUsuariosData?.find(u => u.auth_user_id === s.usuario_id)
        return {
          ...s,
          usuario: usuario ? {
            colaborador: usuario.colaborador,
            cedula: usuario.cedula,
            cargo: usuario.cargos ? usuario.cargos.nombre : 'N/A',
            fecha_ingreso: null
          } : null
        }
      })
      setSolicitudesVacaciones(solicitudesVacacionesCompletas)
    } else {
      setSolicitudesVacaciones([])
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      // Obtener datos del usuario desde la tabla usuario_nomina con relaciones
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select(`
          *,
          empresas:empresa_id(nombre),
          sedes:sede_id(nombre),
          eps:eps_id(nombre),
          afp:afp_id(nombre),
          cesantias:cesantias_id(nombre),
          caja_de_compensacion:caja_de_compensacion_id(nombre)
        `)
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al obtener datos del usuario:", userError)
        return
      }

      // Verificar si el usuario está activo
      if (userData.estado !== "activo") {
        await supabase.auth.signOut()
        router.push("/login")
        return
      }

      // Verificar si el usuario es administrador
      if (userData.rol !== 'administrador') {
        router.push('/perfil')
        return
      }

      // Obtener estadísticas
      const { data: users } = await supabase
        .from('usuario_nomina')
        .select('*')
        .eq('rol', 'usuario')

      const { data: activeUsers } = await supabase
        .from('usuario_nomina')
        .select('*')
        .eq('rol', 'usuario')
        .eq('estado', 'activo')

      const { data: inactiveUsers } = await supabase
        .from('usuario_nomina')
        .select('*')
        .eq('rol', 'usuario')
        .eq('estado', 'inactivo')

      // Obtener usuarios que están actualmente en vacaciones
      const today = new Date().toISOString().split('T')[0]
      const { data: vacationRequests } = await supabase
        .from('solicitudes_vacaciones')
        .select('usuario_id')
        .eq('estado', 'aprobado')
        .lte('fecha_inicio', today)
        .gte('fecha_fin', today)
      
      const vacationUserIds = vacationRequests?.map(req => req.usuario_id) || []
      const uniqueVacationUserIds = [...new Set(vacationUserIds)]
      
      const { data: vacationUsers } = uniqueVacationUserIds.length > 0 ? await supabase
        .from('usuario_nomina')
        .select('*')
        .eq('rol', 'usuario')
        .eq('estado', 'activo')
        .in('auth_user_id', uniqueVacationUserIds) : { data: [] }

      const { data: companies } = await supabase
        .from('empresas')
        .select('*')

      // Obtener las últimas 5 solicitudes de certificación pendientes
      const { data: solicitudesCertificacionData } = await supabase
        .from('solicitudes_certificacion')
        .select(`
          *,
          usuario_nomina:usuario_id(colaborador, cedula)
        `)
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false })
        .limit(5)

      // Cargar solicitudes de vacaciones
      await loadSolicitudesVacaciones()

      // Obtener las últimas 5 solicitudes de permisos pendientes
      const { data: solicitudesPermisosData } = await supabase
        .from('solicitudes_permisos')
        .select(`
          id, tipo_permiso, fecha_inicio, fecha_fin, hora_inicio, hora_fin, 
          motivo, compensacion, estado, fecha_solicitud, fecha_resolucion, 
          motivo_rechazo, pdf_url, usuario_id, admin_id
        `)
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false })
        .limit(5)

      // Obtener datos de usuarios para las solicitudes de permisos
      let solicitudesPermisosCompletas = []
      if (solicitudesPermisosData && solicitudesPermisosData.length > 0) {
        const permisosUserIds = [...new Set(solicitudesPermisosData.map(s => s.usuario_id))]
        const { data: permisosUsuariosData } = await supabase
          .from('usuario_nomina')
          .select(`
            auth_user_id,
            colaborador,
            cedula,
            cargo_id,
            empresa_id,
            empresas:empresa_id(nombre),
            cargos:cargo_id(nombre)
          `)
          .in('auth_user_id', permisosUserIds)

        solicitudesPermisosCompletas = solicitudesPermisosData.map(s => {
          const usuario = permisosUsuariosData?.find(u => u.auth_user_id === s.usuario_id)
          return {
            ...s,
            usuario: usuario ? {
              colaborador: usuario.colaborador,
              cedula: usuario.cedula,
              cargo: usuario.cargos ? usuario.cargos.nombre : 'N/A',
              fecha_ingreso: null,
              empresa_id: usuario.empresa_id,
              empresas: usuario.empresas
            } : null
          }
        })
      }

      // Obtener notificaciones de incapacidades pendientes
      const { data: incapacidadesData } = await supabase
        .from('solicitudes_incapacidades')
        .select(`
          *,
          usuario_nomina:usuario_id(colaborador, cedula)
        `)
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false })
        .limit(5)

      setStats({
        totalUsers: users?.length || 0,
        activeUsers: activeUsers?.length || 0,
        inactiveUsers: inactiveUsers?.length || 0,
        vacationUsers: vacationUsers?.length || 0,
        totalCompanies: companies?.length || 0
      })

      setNotificacionesIncapacidades(incapacidadesData || [])

      setSolicitudesCertificacion(solicitudesCertificacionData || [])
      setSolicitudesPermisos(solicitudesPermisosCompletas || [])
      setUserData(userData)
      setLoading(false)

      // Configurar subscripciones en tiempo real
      const vacacionesSubscription = supabase
        .channel('solicitudes_vacaciones_dashboard')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitudes_vacaciones',
            filter: 'estado=eq.pendiente'
          },
          async () => {
             // Recargar solicitudes de vacaciones cuando hay cambios
             await loadSolicitudesVacaciones()
           }
        )
        .subscribe()

      // Cleanup function
      return () => {
        vacacionesSubscription.unsubscribe()
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="text-2xl font-semibold text-gray-700">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName="Administrador" />

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
                  <p className="text-muted-foreground">Gestiona usuarios y configuración del sistema.</p>
                </div>

                {/* Tarjetas informativas principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      <FaUserCheck className="mr-2 text-green-600" /> Usuarios activos
                    </h3>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-green-600">{stats.activeUsers}</span>
                      <span className="ml-2 text-sm text-gray-500">usuarios</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      <FaUserTimes className="mr-2 text-red-600" /> Usuarios Inactivos
                    </h3>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-red-600">{stats.inactiveUsers}</span>
                      <span className="ml-2 text-sm text-gray-500">usuarios</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      <FaBuilding className="mr-2 text-blue-600" /> Empresas registradas
                    </h3>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-blue-600">{stats.totalCompanies}</span>
                      <span className="ml-2 text-sm text-gray-500">empresas</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      <FaUmbrellaBeach className="mr-2 text-orange-600" /> Usuarios de vacaciones
                    </h3>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-orange-600">{stats.vacationUsers}</span>
                      <span className="ml-2 text-sm text-gray-500">usuarios</span>
                    </div>
                  </div>
                </div>

                {/* Grid de Solicitudes - 2x2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tabla de Solicitudes de Certificación */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Solicitudes de Certificación Laboral</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/administracion/solicitudes/certificacion-laboral')}
                      >
                        Ver todas
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudesCertificacion.map((solicitud) => (
                          <TableRow key={solicitud.id}>
                            <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                            <TableCell>{solicitud.usuario_nomina?.colaborador}</TableCell>
                            <TableCell>
                              <Badge
                                variant={solicitud.estado === 'aprobado' ? 'secondary' :
                                        solicitud.estado === 'rechazado' ? 'destructive' :
                                        'default'}
                              >
                                {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {solicitudesCertificacion.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              No hay solicitudes pendientes
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Tabla de Solicitudes de Vacaciones */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Solicitudes de Vacaciones</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/administracion/solicitudes/vacaciones')}
                      >
                        Ver todas
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Días</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudesVacaciones.map((solicitud) => (
                          <TableRow key={solicitud.id}>
                            <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                            <TableCell>{solicitud.usuario?.colaborador}</TableCell>
                            <TableCell>
                              {Math.ceil(
                                (new Date(solicitud.fecha_fin).getTime() - 
                                new Date(solicitud.fecha_inicio).getTime()) / 
                                (1000 * 3600 * 24)
                              ) + 1}
                            </TableCell>
                          </TableRow>
                        ))}
                        {solicitudesVacaciones.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              No hay solicitudes pendientes
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Tabla de Solicitudes de Permisos */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Solicitudes de Permisos</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/administracion/solicitudes/permisos')}
                      >
                        Ver todas
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudesPermisos.map((solicitud) => (
                          <TableRow key={solicitud.id}>
                            <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                            <TableCell>{solicitud.usuario?.colaborador}</TableCell>
                            <TableCell>{solicitud.tipo_permiso}</TableCell>
                          </TableRow>
                        ))}
                        {solicitudesPermisos.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              No hay solicitudes pendientes
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Tabla de Notificaciones de Incapacidades */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Notificaciones de Incapacidades</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/administracion/solicitudes/incapacidades')}
                      >
                        Ver todas
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Días</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notificacionesIncapacidades.map((solicitud) => (
                          <TableRow key={solicitud.id}>
                            <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                            <TableCell>{solicitud.usuario_nomina?.colaborador}</TableCell>
                            <TableCell>
                              {Math.ceil(
                                (new Date(solicitud.fecha_fin).getTime() - 
                                new Date(solicitud.fecha_inicio).getTime()) / 
                                (1000 * 3600 * 24)
                              ) + 1}
                            </TableCell>
                          </TableRow>
                        ))}
                        {notificacionesIncapacidades.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              No hay notificaciones pendientes
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}