// app/administracion/solicitudes/vacaciones/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import AdminVacacionesCalendar from "@/components/vacaciones/AdminVacacionesCalendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"

interface SolicitudVacacion {
  id: string
  usuario_id: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  fecha_solicitud: string
  usuario?: {
    colaborador: string
    cedula: string
    cargo: string
    empresas?: {
      nombre: string
    }
  }
}

export default function AdminVacacionesPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudVacacion[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Carga solicitudes pendientes
  const fetchSolicitudesPendientes = async () => {
    try {
      const { data, error } = await supabase
        .from("solicitudes_vacaciones")
        .select(`
          id,
          usuario_id,
          estado,
          fecha_inicio,
          fecha_fin,
          fecha_solicitud
        `)
        .eq("estado", "pendiente")
        .order("fecha_solicitud", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        // Obtener datos de usuarios
        const userIds = data.map(s => s.usuario_id)
        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuario_nomina")
          .select(`
            auth_user_id,
            colaborador,
            cedula,
            cargo,
            empresa_id,
            empresas:empresa_id(nombre)
          `)
          .in("auth_user_id", userIds)

        if (usuariosError) throw usuariosError

        // Combinar datos
        const solicitudesCompletas = data.map(s => {
          const usuario = usuariosData?.find(u => u.auth_user_id === s.usuario_id)
          return {
            id: s.id as string,
            usuario_id: s.usuario_id as string,
            estado: s.estado as string,
            fecha_inicio: s.fecha_inicio as string,
            fecha_fin: s.fecha_fin as string,
            fecha_solicitud: s.fecha_solicitud as string,
            usuario: usuario ? {
              colaborador: usuario.colaborador as string,
              cedula: usuario.cedula as string,
              cargo: usuario.cargo as string,
              empresas: usuario.empresas ? {
                nombre: (usuario.empresas as any).nombre as string
              } : undefined
            } : undefined
          } as SolicitudVacacion
        })

        setSolicitudesPendientes(solicitudesCompletas)
      } else {
        setSolicitudesPendientes([])
      }
    } catch (err: any) {
      console.error("Error al cargar solicitudes:", err.message)
      setError("No se pudieron cargar las solicitudes pendientes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSolicitudesPendientes()
  }, [supabase])

  const handleApprove = async (solicitudId: string) => {
    setActionLoading(solicitudId)
    setError(null)
    try {
      const { error } = await supabase
        .from("solicitudes_vacaciones")
        .update({
          estado: "aprobado",
          fecha_resolucion: new Date().toISOString()
        })
        .eq("id", solicitudId)

      if (error) throw error

      setSuccessMessage("Solicitud aprobada correctamente")
      await fetchSolicitudesPendientes()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al aprobar la solicitud")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (solicitudId: string) => {
    setActionLoading(solicitudId)
    setError(null)
    try {
      const { error } = await supabase
        .from("solicitudes_vacaciones")
        .update({
          estado: "rechazado",
          fecha_resolucion: new Date().toISOString(),
          motivo_rechazo: "Rechazado por el administrador"
        })
        .eq("id", solicitudId)

      if (error) throw error

      setSuccessMessage("Solicitud rechazada correctamente")
      await fetchSolicitudesPendientes()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al rechazar la solicitud")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (fecha: string) => {
    // If it's a string in YYYY-MM-DD format, parse it manually to avoid timezone issues
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = fecha.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
    
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p>Cargando calendario y solicitudes…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />

      <div className="flex-1 md:pl-64">
        <div className="max-w-[95%] mx-auto py-8 space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Gestión de Vacaciones</h1>
            <Button 
              onClick={() => router.push('/administracion/solicitudes/vacaciones/historico')}
              variant="outline"
            >
              Ver Histórico
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="default" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Calendario de Vacaciones */}
          <AdminVacacionesCalendar />

          {/* Tabla de Solicitudes Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Solicitudes Pendientes ({solicitudesPendientes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {solicitudesPendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Fin</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Fecha Solicitud</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudesPendientes.map((solicitud) => (
                        <TableRow key={solicitud.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{solicitud.usuario?.colaborador || "N/A"}</p>
                              <p className="text-sm text-gray-500">{solicitud.usuario?.cedula || "N/A"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{solicitud.usuario?.empresas?.nombre || "N/A"}</TableCell>
                          <TableCell>{solicitud.usuario?.cargo || "N/A"}</TableCell>
                          <TableCell>{formatDate(solicitud.fecha_inicio)}</TableCell>
                          <TableCell>{formatDate(solicitud.fecha_fin)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {calcularDiasVacaciones(solicitud.fecha_inicio, solicitud.fecha_fin)} días
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(solicitud.fecha_solicitud)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {solicitud.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(solicitud.id)}
                                disabled={actionLoading === solicitud.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === solicitud.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(solicitud.id)}
                                disabled={actionLoading === solicitud.id}
                              >
                                {actionLoading === solicitud.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
