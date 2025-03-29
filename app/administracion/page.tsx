"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { ProfileCard } from "@/components/ui/profile-card"
import { Skeleton } from "@/components/ui/skeleton"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { FaUser, FaBuilding } from 'react-icons/fa';

export default function Administracion() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0
  })

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

      const { data: companies } = await supabase
        .from('empresas')
        .select('*')

      setStats({
        totalUsers: users?.length || 0,
        totalCompanies: companies?.length || 0
      })

      setUserData(userData)
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
      <AdminSidebar userName="Administrador" />

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
                  <p className="text-muted-foreground">Gestiona usuarios y configuración del sistema.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      <FaUser className="mr-2 text-blue-600" /> Usuarios Registrados
                    </h3>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-blue-600">{stats.totalUsers}</span>
                      <span className="ml-2 text-sm text-gray-500">usuarios</span>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      <FaBuilding className="mr-2 text-green-600" /> Empresas Registradas
                    </h3>
                    <div className="flex items-center">
                      <span className="text-3xl font-bold text-green-600">{stats.totalCompanies}</span>
                      <span className="ml-2 text-sm text-gray-500">empresas</span>
                    </div>
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