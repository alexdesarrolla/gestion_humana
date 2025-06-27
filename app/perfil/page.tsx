"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { ProfileCard } from "@/components/ui/profile-card"
import { Skeleton } from "@/components/ui/skeleton"
import { createSupabaseClient } from "@/lib/supabase"

export default function Perfil() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
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
          caja_de_compensacion:caja_de_compensacion_id(nombre),
          cargos:cargo_id(id, nombre)
        `)
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al obtener datos del usuario:", userError)
        return
      }

      // Permitir acceso a usuarios inactivos para que puedan ver su perfil
      // (Se removió la verificación que redirigía a login)

      // Verificar si el usuario está actualmente de vacaciones
      const today = new Date().toISOString().split('T')[0]
      const { data: vacacionesActivas } = await supabase
        .from("solicitudes_vacaciones")
        .select("*")
        .eq("usuario_id", session.user.id)
        .eq("estado", "aprobado")
        .lte("fecha_inicio", today)
        .gte("fecha_fin", today)

      // Obtener todas las vacaciones aprobadas del usuario para determinar el estado
      const { data: todasVacacionesAprobadas } = await supabase
        .from("solicitudes_vacaciones")
        .select("fecha_inicio, fecha_fin")
        .eq("usuario_id", session.user.id)
        .eq("estado", "aprobado")
        .order("fecha_inicio", { ascending: false })

      let estadoVacaciones = "sin_vacaciones"
      let rangoVacaciones = null
      
      if (todasVacacionesAprobadas && todasVacacionesAprobadas.length > 0) {
        const currentYear = new Date().getFullYear()
        
        // Buscar vacaciones del año actual
        const vacacionesEsteAno = todasVacacionesAprobadas.filter(v => {
          const fechaInicio = new Date(v.fecha_inicio)
          return fechaInicio.getFullYear() === currentYear
        })
        
        if (vacacionesEsteAno.length > 0) {
          const proximasVacaciones = vacacionesEsteAno[0]
          const fechaInicio = new Date(proximasVacaciones.fecha_inicio)
          const fechaFin = new Date(proximasVacaciones.fecha_fin)
          const hoy = new Date()
          
          if (fechaFin < hoy) {
            // Ya tomó vacaciones este año
            estadoVacaciones = "ya_tomo"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          } else if (fechaInicio <= hoy && fechaFin >= hoy) {
            // Está actualmente de vacaciones
            estadoVacaciones = "en_vacaciones"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          } else if (fechaInicio > hoy) {
            // Tiene vacaciones pendientes
            estadoVacaciones = "pendientes"
            rangoVacaciones = {
              inicio: proximasVacaciones.fecha_inicio,
              fin: proximasVacaciones.fecha_fin
            }
          }
        }
      }

      // Agregar el estado de vacaciones al userData
      const userDataWithVacaciones = {
        ...userData,
        enVacaciones: vacacionesActivas && vacacionesActivas.length > 0,
        estadoVacaciones,
        rangoVacaciones
      }

      setUserData(userDataWithVacaciones)
      setLoading(false)
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
      <Sidebar userName={userData?.colaborador} />

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Mis Datos</h1>
                  <p className="text-muted-foreground">Visualiza tu información personal, laboral y de afiliaciones.</p>
                </div>

                <div className="divide-y divide-border rounded-md border">
                  {loading ? (
                    <div className="p-6 space-y-6">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ) : (
                    <ProfileCard userData={userData} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

