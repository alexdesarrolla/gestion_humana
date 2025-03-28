"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { createSupabaseClient } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Search, X, Eye, ArrowUpDown } from "lucide-react"
import { ProfileCard } from "@/components/ui/profile-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default function Usuarios() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [empresas, setEmpresas] = useState<any[]>([])
  const [cargos, setCargos] = useState<any[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("")
  const [selectedCargo, setSelectedCargo] = useState<string>("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
        console.error("Error al verificar rol:", userError)
        router.push("/perfil")
        return
      }

      if (currentUser.rol !== "administrador") {
        console.log("Usuario no tiene permisos de administrador")
        router.push("/perfil")
        return
      }

      // Obtener lista de usuarios con rol 'usuario'
      const { data: usuarios, error: usuariosError } = await supabase
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
        .eq("rol", "usuario")

      if (usuariosError) {
        console.error("Error al obtener usuarios:", usuariosError)
        setLoading(false)
        return
      }

      setUsers(usuarios || [])
      setFilteredUsers(usuarios || [])

      // Extraer empresas únicas
      const uniqueEmpresas = Array.from(new Set(usuarios?.map((user) => user.empresas?.nombre).filter(Boolean)))
      setEmpresas(uniqueEmpresas)

      // Extraer cargos únicos
      const uniqueCargos = Array.from(new Set(usuarios?.map((user) => user.cargo).filter(Boolean)))
      setCargos(uniqueCargos)

      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Función para ordenar
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }

  // Aplicar filtros y ordenamiento
  useEffect(() => {
    let result = [...users]

    // Aplicar búsqueda
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      result = result.filter(
        (user) =>
          user.colaborador?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.correo_electronico?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.cargo?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.empresas?.nombre?.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    // Aplicar filtro de empresa
    if (selectedEmpresa) {
      result = result.filter((user) => user.empresas?.nombre === selectedEmpresa)
    }

    // Aplicar filtro de cargo
    if (selectedCargo) {
      result = result.filter((user) => user.cargo === selectedCargo)
    }

    // Aplicar ordenamiento
    if (sortConfig !== null) {
      result.sort((a, b) => {
        // Manejar propiedades anidadas como 'empresas.nombre'
        let aValue, bValue

        if (sortConfig.key === "empresas") {
          aValue = a.empresas?.nombre || ""
          bValue = b.empresas?.nombre || ""
        } else {
          aValue = a[sortConfig.key] || ""
          bValue = b[sortConfig.key] || ""
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }

    setFilteredUsers(result)
  }, [users, searchTerm, sortConfig, selectedEmpresa, selectedCargo])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEmpresa("")
    setSelectedCargo("")
    setSortConfig(null)
  }

  const handleViewDetails = (user: any) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-4 w-4" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    )
  }

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

                {/* Filtros */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Buscar</label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nombre, correo, cargo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Empresa</label>
                        <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las empresas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las empresas</SelectItem>
                            {empresas.map((empresa) => (
                              <SelectItem key={empresa} value={empresa}>
                                {empresa}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Cargo</label>
                        <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los cargos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los cargos</SelectItem>
                            {cargos.map((cargo) => (
                              <SelectItem key={cargo} value={cargo}>
                                {cargo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button variant="outline" onClick={clearFilters} className="flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Limpiar filtros
                      </Button>
                    </div>

                    {/* Indicadores de filtros activos */}
                    {(searchTerm || selectedEmpresa || selectedCargo || sortConfig) && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <div className="text-sm text-muted-foreground">Filtros activos:</div>
                        {searchTerm && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Búsqueda: {searchTerm}
                          </Badge>
                        )}
                        {selectedEmpresa && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Empresa: {selectedEmpresa}
                          </Badge>
                        )}
                        {selectedCargo && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Cargo: {selectedCargo}
                          </Badge>
                        )}
                        {sortConfig && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Ordenado por: {sortConfig.key} (
                            {sortConfig.direction === "asc" ? "ascendente" : "descendente"})
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="rounded-md border bg-white">
                  {loading ? (
                    <div className="p-6 space-y-6">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Avatar</TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("colaborador")}
                            >
                              <div className="flex items-center">
                                Nombre
                                {getSortIcon("colaborador")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("cargo")}
                            >
                              <div className="flex items-center">
                                Cargo
                                {getSortIcon("cargo")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("empresas")}
                            >
                              <div className="flex items-center">
                                Empresa
                                {getSortIcon("empresas")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => requestSort("correo_electronico")}
                            >
                              <div className="flex items-center">
                                Correo
                                {getSortIcon("correo_electronico")}
                              </div>
                            </TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No se encontraron usuarios con los filtros aplicados
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  {user.avatar_path ? (
                                    <img
                                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${user.avatar_path}`}
                                      className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                      alt="Avatar"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                                      {user.colaborador?.charAt(0) || "?"}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{user.colaborador}</TableCell>
                                <TableCell>{user.cargo || "N/A"}</TableCell>
                                <TableCell>
                                  {user.empresas?.nombre ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                      {user.empresas.nombre}
                                    </Badge>
                                  ) : (
                                    "N/A"
                                  )}
                                </TableCell>
                                <TableCell>{user.correo_electronico}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => handleViewDetails(user)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    Ver detalles
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de detalles de usuario */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Detalles del Usuario</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <ProfileCard userData={selectedUser} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

