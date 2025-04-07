"use client"

import { useState, useEffect } from "react"
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
import { AlertCircle, CheckCircle2, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AdminSolicitudesVacaciones() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<{id: string, usuario: any} | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState("")

  // Obtener solicitudes pendientes
  useEffect(() => {
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase
          .from('solicitudes_vacaciones')
          .select(`
            *,
            usuario:usuario_id(colaborador, cedula, cargo, fecha_ingreso, empresa_id, empresas(nombre, razon_social, nit))
          `)
          .eq('estado', 'pendiente')
          .order('fecha_solicitud', { ascending: true })

        if (error) throw error
        setSolicitudes(data || [])
      } catch (err) {
        console.error("Error al obtener solicitudes:", err)
        setError("Error al cargar las solicitudes")
      } finally {
        setLoading(false)
      }
    }

    fetchSolicitudes()
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

      setSuccess("Solicitud aprobada correctamente.")
      setSolicitudes(solicitudes.filter(s => s.id !== solicitudId))
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

      setSuccess("Solicitud rechazada correctamente.")
      setSolicitudes(solicitudes.filter(s => s.id !== solicitudId))
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Vacaciones</h1>
                    <p className="text-muted-foreground">
                      Gestiona las solicitudes pendientes de vacaciones.
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

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Fecha inicio</TableHead>
                          <TableHead>Fecha fin</TableHead>
                          <TableHead>Días</TableHead>
                          <TableHead>Fecha solicitud</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center">
                              No hay solicitudes pendientes en este momento.
                            </TableCell>
                          </TableRow>
                        ) : (
                          solicitudes.map((solicitud) => (
                            <TableRow key={solicitud.id}>
                              <TableCell>{solicitud.usuario.colaborador}</TableCell>
                              <TableCell>{solicitud.usuario.cedula}</TableCell>
                              <TableCell>{solicitud.usuario.cargo}</TableCell>
                              <TableCell>{formatDate(new Date(solicitud.fecha_inicio))}</TableCell>
                              <TableCell>{formatDate(new Date(solicitud.fecha_fin))}</TableCell>
                              <TableCell>
                                {calcularDiasVacaciones(solicitud.fecha_inicio, solicitud.fecha_fin)} días
                              </TableCell>
                              <TableCell>{formatDate(new Date(solicitud.fecha_solicitud))}</TableCell>
                              <TableCell>
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