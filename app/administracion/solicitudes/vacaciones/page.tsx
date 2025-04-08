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
import { AlertCircle, CheckCircle2, Calendar, Search, X, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminSolicitudesVacaciones() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<{id: string, usuario: any} | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<string>("") 
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("")
  const [empresas, setEmpresas] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  
  // Referencia para el timeout de búsqueda
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const supabase = createSupabaseClient()
    
    // Suscribirse a cambios en la tabla de vacaciones
    const channel = supabase
      .channel('admin_vacaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_vacaciones'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Para inserciones, obtener la solicitud completa con datos del usuario
            const { data, error } = await supabase
              .from('solicitudes_vacaciones')
              .select(`
                *,
                usuario:usuario_id(colaborador, cedula, cargo, fecha_ingreso, empresa_id, empresas(nombre, razon_social, nit)),
                admin:admin_id(colaborador)
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              console.error("Error al obtener nueva solicitud:", error)
              return
            }

            setSolicitudes(prev => [data, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            // Para actualizaciones, obtener la solicitud actualizada
            const { data, error } = await supabase
              .from('solicitudes_vacaciones')
              .select(`
                *,
                usuario:usuario_id(colaborador, cedula, cargo, fecha_ingreso, empresa_id, empresas(nombre, razon_social, nit)),
                admin:admin_id(colaborador)
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              console.error("Error al obtener solicitud actualizada:", error)
              return
            }

            setSolicitudes(prev =>
              prev.map(sol => sol.id === payload.new.id ? data : sol)
            )
          } else if (payload.eventType === 'DELETE') {
            setSolicitudes(prev =>
              prev.filter(sol => sol.id !== payload.old.id)
            )
          }

          // Aplicar filtros después de cualquier cambio
          setTimeout(() => {
            applyFilters(searchTerm, selectedEstado, selectedEmpresa, sortConfig)
          }, 0)

          // Actualizar lista de empresas
          const uniqueEmpresas = Array.from(
            new Set(data?.map((solicitud) => solicitud.usuario?.empresas?.nombre).filter(Boolean))
          )
          setEmpresas(uniqueEmpresas)
        }
      )
      .subscribe()

    // Cargar datos iniciales
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('solicitudes_vacaciones')
          .select(`
            *,
            usuario:usuario_id(colaborador, cedula, cargo, fecha_ingreso, empresa_id, empresas(nombre, razon_social, nit)),
            admin:admin_id(colaborador)
          `)
          .order('fecha_solicitud', { ascending: false })

        if (error) throw error
        
        // Guardar todas las solicitudes
        setSolicitudes(data || [])
        setFilteredSolicitudes(data || [])
        
        // Extraer empresas únicas para el filtro
        const uniqueEmpresas = Array.from(
          new Set(data?.map((solicitud) => solicitud.usuario?.empresas?.nombre).filter(Boolean))
        )
        setEmpresas(uniqueEmpresas)
      } catch (err) {
        console.error("Error al obtener solicitudes:", err)
        setError("Error al cargar las solicitudes")
      } finally {
        setLoading(false)
      }
    }

    fetchSolicitudes()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('es-CO', options)
  }

  const calcularDiasVacaciones = (fechaInicio: string, fechaFin: string) => {
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const diferencia = fin.getTime() - inicio.getTime()
    return Math.ceil(diferencia / (1000 * 3600 * 24)) + 1 // +1 para incluir el día de inicio
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
      applyFilters(value, selectedEstado, selectedEmpresa, sortConfig)
    }, 300)
  }
  
  // Función para aplicar todos los filtros
  const applyFilters = (
    search: string,
    estado: string,
    empresa: string,
    sort: { key: string; direction: "asc" | "desc" } | null,
  ) => {
    let result = [...solicitudes]

    // Aplicar búsqueda
    if (search) {
      const lowerCaseSearchTerm = search.toLowerCase()
      result = result.filter(
        (solicitud) =>
          solicitud.usuario?.colaborador?.toLowerCase().includes(lowerCaseSearchTerm) ||
          solicitud.usuario?.cedula?.toLowerCase().includes(lowerCaseSearchTerm) ||
          solicitud.usuario?.cargo?.toLowerCase().includes(lowerCaseSearchTerm) ||
          solicitud.usuario?.empresas?.nombre?.toLowerCase().includes(lowerCaseSearchTerm)
      )
    }

    // Aplicar filtro de estado
    if (estado && estado !== "all") {
      result = result.filter((solicitud) => solicitud.estado === estado)
    }

    // Aplicar filtro de empresa
    if (empresa && empresa !== "all") {
      result = result.filter((solicitud) => solicitud.usuario?.empresas?.nombre === empresa)
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
        } else if (sort.key === "fecha_solicitud" || sort.key === "fecha_inicio" || sort.key === "fecha_fin") {
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

    setFilteredSolicitudes(result)
    setSearchLoading(false) // Ocultar el preloader
  }
  
  // Efecto para aplicar filtros cuando cambian los selectores o el ordenamiento
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => {
      applyFilters(searchTerm, selectedEstado, selectedEmpresa, sortConfig)
    }, 300)
  }, [selectedEstado, selectedEmpresa, sortConfig, solicitudes])
  
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEstado("")
    setSelectedEmpresa("")
    setSortConfig(null)

    // Aplicar filtros inmediatamente sin esperar
    applyFilters("", "", "", null)
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
  
  // Función para obtener el color del badge según el estado
  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return 'success'
      case 'rechazado':
        return 'destructive'
      case 'pendiente':
        return 'default'
      default:
        return 'outline'
    }
  }

  const aprobarSolicitud = async (solicitudId: string) => {
    try {
      setLoading(true)
      setError("")
      
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update({
          estado: 'aprobado',
          admin_id: session.user.id,
          fecha_resolucion: new Date()
        })
        .eq('id', solicitudId)

      if (error) throw error

      // Actualizar la solicitud en el estado local
      const solicitudActualizada = solicitudes.find(s => s.id === solicitudId)
      if (solicitudActualizada) {
        solicitudActualizada.estado = 'aprobado'
        solicitudActualizada.admin_id = session.user.id
        solicitudActualizada.fecha_resolucion = new Date()
      }

      // Actualizar el estado
      setSolicitudes([...solicitudes])
      setSuccess("Solicitud aprobada correctamente.")
      
      // Volver a aplicar los filtros
      applyFilters(searchTerm, selectedEstado, selectedEmpresa, sortConfig)
    } catch (err) {
      console.error("Error al aprobar solicitud:", err)
      setError("Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  const rechazarSolicitud = async (solicitudId: string, motivo: string) => {
    try {
      setLoading(true)
      setError("")
      
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update({
          estado: 'rechazado',
          admin_id: session.user.id,
          fecha_resolucion: new Date(),
          motivo_rechazo: motivo
        })
        .eq('id', solicitudId)

      if (error) throw error

      // Actualizar la solicitud en el estado local
      const solicitudActualizada = solicitudes.find(s => s.id === solicitudId)
      if (solicitudActualizada) {
        solicitudActualizada.estado = 'rechazado'
        solicitudActualizada.admin_id = session.user.id
        solicitudActualizada.fecha_resolucion = new Date()
        solicitudActualizada.motivo_rechazo = motivo
      }

      // Actualizar el estado
      setSolicitudes([...solicitudes])
      setSuccess("Solicitud rechazada correctamente.")
      
      // Volver a aplicar los filtros
      applyFilters(searchTerm, selectedEstado, selectedEmpresa, sortConfig)
      
      setShowModal(false)
      setMotivoRechazo("")
    } catch (err) {
      console.error("Error al rechazar solicitud:", err)
      setError("Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  if (loading && solicitudes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="text-2xl font-semibold text-gray-700">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName="Administrador" />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Ingresa el motivo por el cual rechazas esta solicitud de vacaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="motivoRechazo" className="text-right">
                Motivo
              </Label>
              <Input
                id="motivoRechazo"
                className="col-span-3"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (solicitudSeleccionada) {
                  rechazarSolicitud(solicitudSeleccionada.id, motivoRechazo)
                }
              }}
              disabled={!motivoRechazo.trim()}
            >
              Rechazar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Vacaciones</h1>
                    <p className="text-muted-foreground">
                      Gestiona todas las solicitudes de vacaciones y su historial.
                    </p>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                {/* Filtros */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Buscar</label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nombre, cédula, cargo..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-8"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-48">
                        <label className="text-sm font-medium mb-1 block">Estado</label>
                        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="aprobado">Aprobado</SelectItem>
                            <SelectItem value="rechazado">Rechazado</SelectItem>
                          </SelectContent>
                        </Select>
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

                      <Button variant="outline" onClick={clearFilters} className="flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Limpiar filtros
                      </Button>
                    </div>

                    {/* Indicadores de filtros activos */}
                    {(searchTerm || selectedEstado || selectedEmpresa || sortConfig) && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <div className="text-sm text-muted-foreground">Filtros activos:</div>
                        {searchTerm && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Búsqueda: {searchTerm}
                          </Badge>
                        )}
                        {selectedEstado && selectedEstado !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Estado: {selectedEstado.charAt(0).toUpperCase() + selectedEstado.slice(1)}
                          </Badge>
                        )}
                        {selectedEmpresa && selectedEmpresa !== "all" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            Empresa: {selectedEmpresa}
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

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => requestSort("colaborador")}
                          >
                            <div className="flex items-center">
                              Colaborador
                              {getSortIcon("colaborador")}
                            </div>
                          </TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => requestSort("fecha_inicio")}
                          >
                            <div className="flex items-center">
                              Fecha inicio
                              {getSortIcon("fecha_inicio")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => requestSort("fecha_fin")}
                          >
                            <div className="flex items-center">
                              Fecha fin
                              {getSortIcon("fecha_fin")}
                            </div>
                          </TableHead>
                          <TableHead>Días</TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => requestSort("fecha_solicitud")}
                          >
                            <div className="flex items-center">
                              Fecha solicitud
                              {getSortIcon("fecha_solicitud")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => requestSort("estado")}
                          >
                            <div className="flex items-center">
                              Estado
                              {getSortIcon("estado")}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => requestSort("empresa")}
                          >
                            <div className="flex items-center">
                              Empresa
                              {getSortIcon("empresa")}
                            </div>
                          </TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchLoading ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
                              <div className="flex justify-center items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Buscando...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredSolicitudes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center">
                              No hay solicitudes que coincidan con los filtros aplicados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSolicitudes.map((solicitud) => (
                            <TableRow key={solicitud.id}>
                              <TableCell>{solicitud.usuario?.colaborador}</TableCell>
                              <TableCell>{solicitud.usuario?.cedula}</TableCell>
                              <TableCell>{solicitud.usuario?.cargo}</TableCell>
                              <TableCell>{formatDate(new Date(solicitud.fecha_inicio))}</TableCell>
                              <TableCell>{formatDate(new Date(solicitud.fecha_fin))}</TableCell>
                              <TableCell>
                                {calcularDiasVacaciones(solicitud.fecha_inicio, solicitud.fecha_fin)} días
                              </TableCell>
                              <TableCell>{formatDate(new Date(solicitud.fecha_solicitud))}</TableCell>
                              <TableCell>
                                <Badge
                                  className={`
                                    ${solicitud.estado === 'aprobado' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                    ${solicitud.estado === 'rechazado' ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''}
                                    ${solicitud.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
                                  `}
                                >
                                  {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                                </Badge>
                                {solicitud.estado === 'rechazado' && solicitud.motivo_rechazo && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Motivo: {solicitud.motivo_rechazo}
                                  </div>
                                )}
                                {solicitud.estado !== 'pendiente' && solicitud.admin && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Por: {solicitud.admin.colaborador}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {solicitud.usuario?.empresas?.nombre}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {solicitud.estado === 'pendiente' ? (
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setSolicitudSeleccionada({id: solicitud.id, usuario: solicitud.usuario})
                                        setShowModal(true)
                                      }}
                                    >
                                      Rechazar
                                    </Button>
                                    <Button 
                                      size="sm"
                                      onClick={() => aprobarSolicitud(solicitud.id)}
                                    >
                                      Aprobar
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    {solicitud.fecha_resolucion ? formatDate(new Date(solicitud.fecha_resolucion)) : ''}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}