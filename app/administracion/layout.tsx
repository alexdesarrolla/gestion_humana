"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { createSupabaseClient } from "@/lib/supabase"

export default function AdministracionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

      // Obtener datos del usuario desde la tabla usuario_nomina
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
        router.push("/login")
        return
      }

      // Verificar que el usuario tenga permisos de administración
      if (userData.rol !== 'administrador' && userData.rol !== 'moderador') {
        router.push("/perfil")
        return
      }

      // Verificar si el usuario está activo
      if (userData.estado !== 'activo') {
        router.push("/login")
        return
      }

      setUserData(userData)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white shadow-sm border-r border-gray-200">
          <div className="p-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar persistente */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex-shrink-0">
        <AdminSidebar userName={userData?.colaborador || 'Administrador'} />
      </div>
      
      {/* Contenido principal */}
      <div className="flex-1 overflow-auto">
        <main className="px-20 py-10 space-y-6">
          {children}
        </main>
      </div>
    </div>
  )
}