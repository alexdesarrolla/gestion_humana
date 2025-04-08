"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, CheckCircle2, Calendar, Search, X, ArrowUpDown, ChevronDown, ChevronUp, FileText, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminNovedadesIncapacidades() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [incapacidades, setIncapacidades] = useState<any[]>([])
  const [filteredIncapacidades, setFilteredIncapacidades] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all") 
  const [empresas, setEmpresas] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  
  // Referencia para el timeout de búsqueda
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Obtener todas las incapacidades
  useEffect(() => {
    const fetchIncapacidades = async () => {
      setLoading(true)
      try {
        const supabase = createSupabaseClient()
        
        // Realizar la consulta con una estructura más simple
        const { data, error } = await supabase
          .from('incapacidades')
          .select(`
            id, fecha_inicio, fecha_fin, fecha_subida, 
            documento_url, usuario_id
          `)
          .order('fecha_subida', { ascending: false })

        if (error) {
          console.error("Error al obtener incapacidades:", error)
          setError("Error al cargar las incapacidades: " + error.message)
          setLoading(false)
          return
        }
        
        // Si la consulta básica funciona, obtener los datos de usuario por separado
        if (data && data.length > 0) {
          // Obtener IDs únicos de usuarios
          const userIds = [...new Set(data.map(item => item.usuario_id))]
          
          // Obtener datos de usuarios
          const { data: usuariosData, error: usuariosError } = await supabase
            .from('usuario_nomina')
            .select(`
              auth_user_id, colaborador, cedula, cargo, fecha_ingreso, empresa_id,
              empresas:empresa_id(nombre, razon_social, nit)
            `)
            .in('auth_user_id', userIds)
          
          if (usuariosError) {
            console.error("Error al obtener datos de usuarios:", usuariosError)
            setError("Error al cargar datos de usuarios: " + usuariosError.message)
          }
          
          // Combinar los datos
          const incapacidadesCompletas = data.map(incapacidad => {
            const usuario = usuariosData?.find(u => u.auth_user_id === incapacidad.usuario_id)
            return {
              ...incapacidad,
              usuario: usuario || null
            }
          })
          
          // Guardar todas las incapacidades
          setIncapacidades(incapacidadesCompletas || [])
          setFilteredIncapacidades(incapacidadesCompletas || [])
          
          // Extraer empresas únicas para el filtro
          const uniqueEmpresas = Array.from(
            new Set(usuariosData?.map((usuario) => usuario.empresas?.nombre).filter(Boolean))
          )
          setEmpresas(uniqueEmpresas)
        } else {
          // Si no hay datos, inicializar con arrays vacíos
          setIncapacidades([])
          setFilteredIncapacidades([])
          setEmpresas([])
        }
      } catch (err) {
        console.error("Error al obtener incapacidades:", err)
        setError("Error al cargar las incapacidades: " + (err.message || JSON.stringify(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchIncapacidades()
  }, [])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('es-CO', options)
  }
  
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
      applyFilters(value, selectedEmpresa, sortConfig)
    }, 300)
  }
  
  // Función para aplicar todos los filtros
  const applyFilters = (
    search: string,
    empresa: string,
    sort: { key: string; direction: "asc" | "desc" } | null,
  ) => {
    let result = [...incapacidades]

    // Aplicar búsqueda
    if (search) {
      const lowerCaseSearchTerm = search.toLowerCase()
      result = result.filter(
        (incapacidad) =>
          incapacidad.usuario?.colaborador?.toLowerCase().includes(lowerCaseSearchTerm) ||
          incapacidad.usuario?.cedula?.toLowerCase().includes(lowerCaseSearchTerm) ||
          incapacidad.usuario?.cargo?.toLowerCase().includes(lowerCaseSearchTerm) ||
          incapacidad.usuario?.empresas?.nombre?.toLowerCase().includes(lowerCaseSearchTerm)
      )
    }

    // Aplicar filtro de empresa
    if (empresa && empresa !== "all") {
      result = result.filter((incapacidad) => incapacidad.usuario?.empresas?.nombre === empresa)
    }

    // Aplicar ordenamiento
    if (sort !== null) {
      result.sort((a, b) => {
        let aValue, bValue

        if (sort.key === "empresa") {
          aValue = a.usuario?.empresas?.nombre || ""
          bValue = b.usuario?.empresas?.nombre || ""
        } else if (sort.key === "colaborador") {
          aValue = a.usuario?.colaborador || ""
          bValue = b.usuario?.colaborador || ""
        } else if (sort.key === "fecha_subida" || sort.key === "fecha_inicio" || sort.key === "fecha_fin") {
          aValue = new Date(a[sort.key] || "").getTime()
          bValue = new Date(b[sort.key] || "").getTime()
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

    setFilteredIncapacidades(result)
    setSearchLoading(false) // Ocultar el preloader
  }
  
  // Efecto para aplicar filtros cuando cambian los selectores o el ordenamiento
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => {
      applyFilters(searchTerm, selectedEmpresa, sortConfig)
    }, 300)
  }, [selectedEmpresa, sortConfig, incapacidades])
  
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEmpresa("all")
    setSortConfig(null)
  }

  const descargarDocumento = async (documentoUrl: string) => {
    try {
      const response = await fetch(documentoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'incapacidad.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al descargar el documento:', error)
      setError('Error al descargar el documento. Por favor intente nuevamente.')
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className=" max-w-[90%] mx-auto flex-1 p-8 md:pl-64">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Gestión de Incapacidades</CardTitle>
            <CardDescription>
              Visualiza y gestiona las incapacidades registradas por los colaboradores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, cédula, cargo o empresa..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchLoading && (
                  <div className="absolute right-2.5 top-2.5">
                    <svg
                      className="animate-spin h-4 w-4 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>

              <div className="w-full md:w-64">
                <Select
                  value={selectedEmpresa}
                  onValueChange={setSelectedEmpresa}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por empresa" />
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

              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={clearFilters}
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>

            {/* Tabla de incapacidades */}
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort("colaborador")}
                    >
                      <div className="flex items-center">
                        Colaborador
                        {sortConfig?.key === "colaborador" && (
                          <span className="ml-1">
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort("empresa")}
                    >
                      <div className="flex items-center">
                        Empresa
                        {sortConfig?.key === "empresa" && (
                          <span className="ml-1">
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort("fecha_inicio")}
                    >
                      <div className="flex items-center">
                        Fecha Inicio
                        {sortConfig?.key === "fecha_inicio" && (
                          <span className="ml-1">
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort("fecha_fin")}
                    >
                      <div className="flex items-center">
                        Fecha Fin
                        {sortConfig?.key === "fecha_fin" && (
                          <span className="ml-1">
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort("fecha_subida")}
                    >
                      <div className="flex items-center">
                        Fecha Subida
                        {sortConfig?.key === "fecha_subida" && (
                          <span className="ml-1">
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        <div className="flex justify-center">
                          <svg
                            className="animate-spin h-6 w-6 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredIncapacidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No se encontraron incapacidades
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncapacidades.map((incapacidad) => (
                      <TableRow key={incapacidad.id}>
                        <TableCell className="font-medium">
                          {incapacidad.usuario?.colaborador || "Usuario no encontrado"}
                        </TableCell>
                        <TableCell>{incapacidad.usuario?.cedula || "N/A"}</TableCell>
                        <TableCell>
                          {incapacidad.usuario?.empresas?.nombre || "N/A"}
                        </TableCell>
                        <TableCell>
                          {incapacidad.fecha_inicio ? formatDate(incapacidad.fecha_inicio) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {incapacidad.fecha_fin ? formatDate(incapacidad.fecha_fin) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {incapacidad.fecha_subida ? formatDate(incapacidad.fecha_subida) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {incapacidad.documento_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => descargarDocumento(incapacidad.documento_url)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              PDF
                            </Button>
                          ) : (
                            "No disponible"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}