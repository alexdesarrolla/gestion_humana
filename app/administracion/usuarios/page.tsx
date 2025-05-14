"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { createSupabaseClient } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Search, X, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { ProfileCard } from "@/components/ui/profile-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export default function Usuarios() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
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

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [paginatedUsers, setPaginatedUsers] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Referencia para el timeout de búsqueda
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

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
        .select("*, empresa_id")
        .eq("rol", "usuario")

      if (usuariosError) {
        console.error("Error al obtener usuarios:", usuariosError)
        setLoading(false)
        return
      }

      // Obtener datos de empresas
      const empresaIds = Array.from(new Set(usuarios?.map(user => user.empresa_id).filter(Boolean)))
      const { data: empresasData } = await supabase
        .from("empresa")
        .select("id, nombre")
        .in("id", empresaIds)

      // Combinar usuarios con datos de empresa
      const usuariosConEmpresa = usuarios?.map(user => ({
        ...user,
        empresa: empresasData?.find(emp => emp.id === user.empresa_id)
      })) || []

      setUsers(usuariosConEmpresa)
      setFilteredUsers(usuariosConEmpresa)

      // Extraer empresas únicas
      const uniqueEmpresas = Array.from(new Set(empresasData?.map(emp => emp.nombre).filter(Boolean)))
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

  // Aplicar filtros y ordenamiento con debounce para la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Mostrar el preloader
    setSearchLoading(true)

    // Limpiar el timeout anterior si existe
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    // Establecer un nuevo timeout para aplicar la búsqueda después de 300ms
    searchTimeout.current = setTimeout(() => {
      applyFilters(value, selectedEmpresa, selectedCargo, sortConfig)
    }, 300)
  }

  // Función para aplicar todos los filtros
  const applyFilters = (
    search: string,
    empresa: string,
    cargo: string,
    sort: { key: string; direction: "asc" | "desc" } | null,
  ) => {
    let result = [...users]

    // Aplicar búsqueda
    if (search) {
      const lowerCaseSearchTerm = search.toLowerCase()
      result = result.filter(
        (user) =>
          user.colaborador?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.correo_electronico?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.cargo?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.empresa?.nombre?.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    // Aplicar filtro de empresa
    if (empresa && empresa !== "all") {
      result = result.filter((user) => user.empresa?.nombre === empresa)
    }

    // Aplicar filtro de cargo
    if (cargo && cargo !== "all") {
      result = result.filter((user) => user.cargo === cargo)
    }

    // Aplicar ordenamiento
    if (sort !== null) {
      result.sort((a, b) => {
        // Manejar propiedades anidadas como 'empresas.nombre'
        let aValue, bValue

        // Definir interfaz para empresas
        interface EmpresaData {
          nombre?: string
        }

        if (sort.key === "empresas") {
          const aEmpresa = a.empresa as EmpresaData | undefined
          const bEmpresa = b.empresa as EmpresaData | undefined
          aValue = aEmpresa?.nombre || ""
          bValue = bEmpresa?.nombre || ""
        } else {
          aValue = a[sort.key] || ""
          bValue = b[sort.key] || ""
        }

        if (aValue < bValue) {
          return sort.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
          return sort.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }

    setFilteredUsers(result)
    setCurrentPage(1) // Resetear a la primera página cuando cambian los filtros
    setSearchLoading(false) // Ocultar el preloader
  }

  // Efecto para aplicar filtros cuando cambian los selectores o el ordenamiento
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => {
      applyFilters(searchTerm, selectedEmpresa, selectedCargo, sortConfig)
    }, 300)
  }, [selectedEmpresa, selectedCargo, sortConfig, users])

  // Efecto para calcular la paginación
  useEffect(() => {
    const total = Math.ceil(filteredUsers.length / itemsPerPage)
    setTotalPages(total || 1)

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setPaginatedUsers(filteredUsers.slice(startIndex, endIndex))
  }, [filteredUsers, currentPage, itemsPerPage])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEmpresa("")
    setSelectedCargo("")
    setSortConfig(null)
    setCurrentPage(1)

    // Aplicar filtros inmediatamente sin esperar
    applyFilters("", "", "", null)
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

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Generar array de páginas para mostrar en la paginación
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Si hay menos páginas que el máximo a mostrar, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Mostrar un subconjunto de páginas centrado en la página actual
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
      let endPage = startPage + maxPagesToShow - 1

      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
    }

    return pageNumbers
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
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
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
                            onChange={handleSearchChange}
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
                        {selectedEmpresa && selectedEmpresa !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Empresa: {selectedEmpresa}
                          </Badge>
                        )}
                        {selectedCargo && selectedCargo !== "all" && (
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
                  {loading || searchLoading ? (
                    <div className="p-6 space-y-6">
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-lg text-muted-foreground">
                          {loading ? "Cargando usuarios..." : "Buscando..."}
                        </span>
                      </div>
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
                          {paginatedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No se encontraron usuarios con los filtros aplicados
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedUsers.map((user) => (
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
                                  {user.empresa?.nombre ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                      {user.empresa.nombre}
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

                  {/* Paginación */}
                  {!loading && !searchLoading && filteredUsers.length > 0 && (
                    <CardFooter className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t">
                      <div className="flex items-center mb-4 sm:mb-0">
                        <span className="text-sm text-muted-foreground mr-2">Mostrar</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number.parseInt(value))
                            setCurrentPage(1) // Resetear a la primera página
                          }}
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="25" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground ml-2">por página</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-muted-foreground mr-4">
                          Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                          {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}{" "}
                          usuarios
                        </div>

                        <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center">
                          {getPageNumbers().map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className="mx-1 h-8 w-8 p-0"
                              onClick={() => goToPage(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
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

