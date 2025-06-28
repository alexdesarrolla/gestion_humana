"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
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

export default function AdminSolicitudesCertificacion() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<any[]>([])
  const [cargos, setCargos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [selectedCargo, setSelectedCargo] = useState<string>("all")
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // carga inicial
  useEffect(() => {
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const supabase = createSupabaseClient()

        // 1. Obtener solicitudes de certificación
        const { data: certs, error: certError } = await supabase
          .from("solicitudes_certificacion")
          .select(`
            id,
            usuario_id,
            admin_id,
            estado,
            dirigido_a,
            ciudad,
            fecha_solicitud,
            fecha_resolucion,
            motivo_rechazo,
            pdf_url,
            salario_contrato
          `)
          .order("fecha_solicitud", { ascending: false })

        if (certError) throw certError
        if (!certs) {
          setSolicitudes([])
          setFilteredSolicitudes([])
          return
        }

        // 2. Obtener datos de usuario y admin
        const userIds = Array.from(new Set(certs.map((s) => s.usuario_id)))
        const adminIds = Array.from(
          new Set(certs.filter((s) => s.admin_id).map((s) => s.admin_id!))
        )

        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuario_nomina")
          .select(`
            auth_user_id,
            nombre,
            cedula,
            cargo,
            empresa_id,
            empresas:empresa_id(nombre)
          `)
          .in("auth_user_id", userIds)

        if (usuariosError) throw usuariosError

        const { data: adminsData, error: adminsError } = await supabase
          .from("usuario_nomina")
          .select("auth_user_id, nombre")
          .in("auth_user_id", adminIds)

        if (adminsError) throw adminsError

        // 3. Combinar y extraer cargos únicos
        const completas = certs.map((s) => {
          const usuario = usuariosData?.find((u) => u.auth_user_id === s.usuario_id) || null
          const admin = adminsData?.find((a) => a.auth_user_id === s.admin_id) || null
          return { ...s, usuario, admin }
        })

        setSolicitudes(completas)
        setFilteredSolicitudes(completas)

        const uniqueCargos = Array.from(
          new Set(
            usuariosData
              .map((u) => u.cargo)
              .filter((c): c is string => Boolean(c))
          )
        )
        setCargos(uniqueCargos)
      } catch (err: any) {
        console.error("Error al cargar solicitudes históricas:", err)
        setError(err?.message || "Error al cargar las solicitudes")
      } finally {
        setLoading(false)
      }
    }

    fetchSolicitudes()
  }, [])

  // aplicar filtros con debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      let result = [...solicitudes]

      // búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        result = result.filter((s) => {
          const u = s.usuario
          return (
            u?.nombre.toLowerCase().includes(term) ||
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

      // cargo
      if (selectedCargo !== "all") {
        result = result.filter((s) => s.usuario?.cargo === selectedCargo)
      }

      setFilteredSolicitudes(result)
    }, 300)

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchTerm, selectedEstado, selectedCargo, solicitudes])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEstado("all")
    setSelectedCargo("all")
  }

  const formatDate = (f?: string | null) =>
    f
      ? new Date(f).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : ""

  const rechazarSolicitud = async (id: string, motivo: string) => {
    try {
      setLoading(true)
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")

      const { error } = await supabase
        .from("solicitudes_certificacion")
        .update({
          estado: "rechazado",
          motivo_rechazo: motivo,
          admin_id: session.user.id,
          fecha_resolucion: new Date(),
        })
        .eq("id", id)

      if (error) throw error

      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, estado: "rechazado", motivo_rechazo: motivo }
            : s
        )
      )
      setFilteredSolicitudes((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, estado: "rechazado", motivo_rechazo: motivo }
            : s
        )
      )
    } catch (err: any) {
      console.error("Error al rechazar solicitud:", err)
      setError(err?.message || "No se pudo rechazar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  const aprobarSolicitud = async (id: string, usuario: any) => {
    // Lógica de aprobación / generación de PDF...
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col flex-1">
        <main className="flex-1 py-6">
          <div className="max-w-[90%] mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Solicitudes de Certificación</h1>
            {error && (
              <div className="text-red-600 bg-red-100 p-2 rounded">{error}</div>
            )}

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
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="cargo" className="mb-2 block">
                      Cargo
                    </Label>
                    <Select
                      value={selectedCargo}
                      onValueChange={setSelectedCargo}
                    >
                      <SelectTrigger id="cargo">
                        <SelectValue placeholder="Todos los cargos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {cargos.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                      <TableHead>Dirigido a</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>SyT</TableHead>
                      <TableHead>Fecha solicitud</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : filteredSolicitudes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No hay solicitudes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSolicitudes.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell>{sol.usuario?.nombre}</TableCell>
                          <TableCell>{sol.usuario?.cedula}</TableCell>
                          <TableCell>{sol.usuario?.cargo}</TableCell>
                          <TableCell>{sol.dirigido_a}</TableCell>
                          <TableCell>{sol.ciudad}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sol.salario_contrato === "Si"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {sol.salario_contrato || "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(sol.fecha_solicitud)}
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
