"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"

export default function AdminSolicitudesVacaciones() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<any[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all")

  useEffect(() => {
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const supabase = createSupabaseClient()

        // 1. Obtener solicitudes de vacaciones
        const { data, error: fetchError } = await supabase
          .from("solicitudes_vacaciones")
          .select(
            `
              id,
              usuario_id,
              admin_id,
              estado,
              fecha_inicio,
              fecha_fin,
              fecha_solicitud,
              fecha_resolucion,
              motivo_rechazo
            `
          )
          .order("fecha_solicitud", { ascending: false })

        if (fetchError) throw fetchError
        if (!data) {
          setSolicitudes([])
          setFilteredSolicitudes([])
          return
        }

        // 2. Obtener datos de usuarios y admins
        const userIds = Array.from(new Set(data.map((s) => s.usuario_id)))
        const adminIds = Array.from(
          new Set(data.filter((s) => s.admin_id).map((s) => s.admin_id!))
        )

        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuario_nomina")
          .select(
            `
              auth_user_id,
              colaborador,
              cedula,
              cargo,
              empresa_id,
              empresas:empresa_id(nombre)
            `
          )
          .in("auth_user_id", userIds)

        if (usuariosError) throw usuariosError

        const { data: adminsData, error: adminsError } = await supabase
          .from("usuario_nomina")
          .select("auth_user_id, colaborador")
          .in("auth_user_id", adminIds)

        if (adminsError) throw adminsError

        // 3. Combinar y extraer empresas
        const completas = data.map((s) => {
          const usuario = usuariosData?.find((u) => u.auth_user_id === s.usuario_id) || null
          const admin = adminsData?.find((a) => a.auth_user_id === s.admin_id) || null
          return { ...s, usuario, admin }
        })

        setSolicitudes(completas)
        setFilteredSolicitudes(completas)

        // Definir el tipo para empresas y extraer nombres únicos
        interface EmpresaData {
          nombre?: string;
        }
        
        const uniqueEmpresas = Array.from(
          new Set(
            usuariosData
              .filter(u => u.empresas && typeof u.empresas === 'object')
              .map((u) => {
                const empresas = u.empresas as EmpresaData;
                return empresas.nombre;
              })
              .filter((n): n is string => Boolean(n))
          )
        )
        setEmpresas(uniqueEmpresas)
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Error al cargar las solicitudes")
      } finally {
        setLoading(false)
      }
    }

    fetchSolicitudes()
  }, [])

  // efecto para aplicar filtros
  useEffect(() => {
    let result = [...solicitudes]

    // búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter((s) => {
        const u = s.usuario
        return (
          u?.colaborador.toLowerCase().includes(term) ||
          u?.cedula.toLowerCase().includes(term) ||
          u?.cargo.toLowerCase().includes(term) ||
          u?.empresas?.nombre.toLowerCase().includes(term)
        )
      })
    }

    // estado
    if (selectedEstado !== "all") {
      result = result.filter((s) => s.estado === selectedEstado)
    }

    // empresa
    if (selectedEmpresa !== "all") {
      result = result.filter(
        (s) => s.usuario?.empresas?.nombre === selectedEmpresa
      )
    }

    setFilteredSolicitudes(result)
  }, [searchTerm, selectedEstado, selectedEmpresa, solicitudes])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEstado("all")
    setSelectedEmpresa("all")
  }

  const formatDate = (fecha?: string | null) => {
    if (!fecha) return ""
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calcularDiasVacaciones = (inicio: string, fin: string) => {
    const start = new Date(inicio)
    const end = new Date(fin)
    const diffMs = end.getTime() - start.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName="Administrador" />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 py-6">
          <div className="max-w-[90%] mx-auto space-y-6">
            {/* Título */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Histórico - Solicitudes de Vacaciones</h1>
            <p className="text-muted-foreground">Gestiona las solicitudes de vacaciones.</p>
            </div>
            <Button onClick={() => router.push('/administracion/solicitudes/vacaciones')}>Ir a vacaciones Pendientes</Button>
            </div>
            {/* filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/3">
                    <Label htmlFor="search" className="mb-2 block">
                      Buscar
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        className="pl-8"
                        placeholder="Buscar por nombre, cédula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2.5 top-2.5"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="estado" className="mb-2 block">
                      Estado
                    </Label>
                    <Select
                      value={selectedEstado}
                      onValueChange={setSelectedEstado}
                    >
                      <SelectTrigger id="estado">
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
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="empresa" className="mb-2 block">
                      Empresa
                    </Label>
                    <Select
                      value={selectedEmpresa}
                      onValueChange={setSelectedEmpresa}
                    >
                      <SelectTrigger id="empresa">
                        <SelectValue placeholder="Todas las empresas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las empresas</SelectItem>
                        {empresas.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* tabla */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Solicitud</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Empresa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : filteredSolicitudes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          No hay solicitudes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSolicitudes.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell>{sol.usuario?.colaborador}</TableCell>
                          <TableCell>{sol.usuario?.cedula}</TableCell>
                          <TableCell>{sol.usuario?.cargo}</TableCell>
                          <TableCell>{formatDate(sol.fecha_inicio)}</TableCell>
                          <TableCell>{formatDate(sol.fecha_fin)}</TableCell>
                          <TableCell>
                            {sol.fecha_inicio && sol.fecha_fin
                              ? `${calcularDiasVacaciones(
                                  sol.fecha_inicio,
                                  sol.fecha_fin
                                )} días`
                              : ""}
                          </TableCell>
                          <TableCell>
                            {formatDate(sol.fecha_solicitud)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sol.estado === "aprobado"
                                  ? "secondary"
                                  : sol.estado === "rechazado"
                                  ? "destructive"
                                  : "default"
                              }
                              className={ // Add the className prop
                                sol.estado === "aprobado"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : sol.estado === "rechazado"
                                 ? "bg-red-100 text-red-800 hover:bg-red-200"
                                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  
                              }
                            >
                              {sol.estado.charAt(0).toUpperCase() +
                                sol.estado.slice(1)}
                            </Badge>
                            {sol.estado === "rechazado" &&
                              sol.motivo_rechazo && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Motivo: {sol.motivo_rechazo}
                                </div>
                              )}
                            {sol.admin && (
                              <div className="text-xs text-gray-500 mt-1">
                                Por: {sol.admin.colaborador}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {sol.usuario?.empresas?.nombre}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
