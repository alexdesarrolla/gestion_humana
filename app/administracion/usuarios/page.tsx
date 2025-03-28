"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { createSupabaseClient } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Usuarios() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
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

      // Obtener datos del usuario actual para verificar rol
      const { data: currentUser, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error('Error al verificar rol:', userError)
        router.push('/perfil')
        return
      }
      
      if (currentUser.rol !== 'administrador') {
        console.log('Usuario no tiene permisos de administrador')
        router.push('/perfil')
        return
      }

      // Obtener lista de usuarios con rol 'usuario'
      const { data: usuarios, error: usuariosError } = await supabase
        .from("usuario_nomina")
        .select(`
          id,
          colaborador,
          cargo,
          correo_electronico,
          avatar_path,
          empresas:empresa_id(nombre),
          sedes:sede_id(nombre)
        `)
        .eq("rol", "usuario")

      if (usuariosError) {
        console.error('Error al obtener usuarios:', usuariosError)
        setLoading(false)
        return
      }
      
      console.log('Usuarios obtenidos:', usuarios)

      setUsers(usuarios || [])
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
                  <h1 className="text-2xl font-bold tracking-tight">Listado de Usuarios</h1>
                  <p className="text-muted-foreground">Gestiona los usuarios del sistema.</p>
                </div>

                <div className="rounded-md border">
                  {loading ? (
                    <div className="p-6 space-y-6">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Avatar</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Correo</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.avatar_path ? (
                                <img 
                                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${user.avatar_path}`}
                                  className="h-10 w-10 rounded-full object-cover"
                                  alt="Avatar"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  {user.colaborador?.charAt(0) || '?'}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{user.colaborador}</TableCell>
                            <TableCell>{user.cargo || 'N/A'}</TableCell>
                            <TableCell>{user.empresas?.nombre}</TableCell>
                            <TableCell>{user.correo_electronico}</TableCell>
                            <TableCell>
                              <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                                Ver detalles
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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