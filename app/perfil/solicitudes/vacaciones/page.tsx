"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Calendar } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function SolicitudVacaciones() {
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleShowReason = (reason: string) => {
    setRejectionReason(reason)
    setShowReasonModal(true)
  }

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    fechaInicio: "",
    fechaFin: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Verificar autenticación y obtener datos del usuario
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      // Obtener datos del usuario
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select(`
          *,
          empresas:empresa_id(nombre, razon_social, nit)
          sedes:sede_id(nombre)
        `)
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError) {
        console.error("Error al obtener datos del usuario:", userError)
        setLoading(false)
        return
      }

      // Obtener solicitudes del usuario
      const { data: solicitudesData, error: solicitudesError } = await supabase
        .from('solicitudes_vacaciones')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      if (solicitudesError) {
        console.error("Error al obtener solicitudes:", solicitudesError)
      } else {
        setSolicitudes(solicitudesData || [])
      }

      setUserData(userData)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const formatDate = (date: string | Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('es-CO', options)
  }

  const enviarSolicitud = async () => {
    if (!formData.fechaInicio || !formData.fechaFin) {
      setError("Por favor complete todos los campos requeridos.")
      return
    }

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    const fechaInicio = new Date(formData.fechaInicio)
    const fechaFin = new Date(formData.fechaFin)
    
    if (fechaFin < fechaInicio) {
      setError("La fecha de fin debe ser posterior a la fecha de inicio.")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      // Crear la solicitud en la base de datos
      const { data, error } = await supabase
        .from('solicitudes_vacaciones')
        .insert([{
          usuario_id: session.user.id,
          fecha_inicio: formData.fechaInicio,
          fecha_fin: formData.fechaFin,
          estado: 'pendiente'
        }])
        .select()

      if (error) throw error

      // Actualizar la lista de solicitudes
      const { data: solicitudesData } = await supabase
        .from('solicitudes_vacaciones')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      setSolicitudes(solicitudesData || [])
      setSuccess("Solicitud de vacaciones enviada correctamente. Espera la aprobación del administrador.")
      setShowModal(false)
      setFormData({ fechaInicio: "", fechaFin: "" })
    } catch (err: any) {
      console.error("Error al enviar la solicitud:", err)
      setError("Error al enviar la solicitud. Por favor intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const calcularDiasVacaciones = (fechaInicio: string, fechaFin: string) => {
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const diferencia = fin.getTime() - inicio.getTime()
    return Math.ceil(diferencia / (1000 * 3600 * 24)) + 1 // +1 para incluir el día de inicio
  }

  return (
    <>
      <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo de rechazo</DialogTitle>
          </DialogHeader>
          <p>{rejectionReason}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Vacaciones</DialogTitle>
            <DialogDescription>
              Completa el formulario para solicitar tus vacaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fechaInicio" className="text-right">
                Fecha de inicio
              </Label>
              <Input
                id="fechaInicio"
                type="date"
                className="col-span-3"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fechaFin" className="text-right">
                Fecha de fin
              </Label>
              <Input
                id="fechaFin"
                type="date"
                className="col-span-3"
                value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
              />
            </div>
            {formData.fechaInicio && formData.fechaFin && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Días solicitados</Label>
                <div className="col-span-3">
                  <Badge variant="secondary">
                    {calcularDiasVacaciones(formData.fechaInicio, formData.fechaFin)} días
                  </Badge>
                </div>
              </div>
            )}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button onClick={enviarSolicitud} disabled={loading}>
              {loading ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading && !userData ? (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
          <div className="text-2xl font-semibold text-gray-700">Cargando...</div>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50">
          <Sidebar userName={userData?.colaborador} />

          {/* Main content */}
          <div className="md:pl-64 flex flex-col flex-1">
            <main className="flex-1">
              <div className="py-6">
                <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Vacaciones</h1>
                        <p className="text-muted-foreground">
                          Gestiona tus solicitudes de vacaciones.
                        </p>
                      </div>
                      <Button onClick={() => setShowModal(true)}>
                        <Calendar className="mr-2 h-4 w-4" /> Solicitar vacaciones
                      </Button>
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
                      <CardHeader>
                        <CardTitle>Mis solicitudes</CardTitle>
                        <CardDescription>
                          Historial de solicitudes de vacaciones realizadas.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha de solicitud</TableHead>
                              <TableHead>Fecha de inicio</TableHead>
                              <TableHead>Fecha de fin</TableHead>
                              <TableHead>Días</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {solicitudes.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                  No has realizado ninguna solicitud de vacaciones.
                                </TableCell>
                              </TableRow>
                            ) : (
                              solicitudes.map((solicitud) => (
                                <TableRow key={solicitud.id}>
                                  <TableCell>{formatDate(solicitud.fecha_solicitud)}</TableCell>
                                  <TableCell>{formatDate(solicitud.fecha_inicio)}</TableCell>
                                  <TableCell>{formatDate(solicitud.fecha_fin)}</TableCell>
                                  <TableCell>
                                    {calcularDiasVacaciones(solicitud.fecha_inicio, solicitud.fecha_fin)} días
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        solicitud.estado === "aprobado"
                                          ? "secondary"
                                          : solicitud.estado === "rechazado"
                                          ? "destructive"
                                          : "default"
                                      }
                                      className={
                                        solicitud.estado === "aprobado"
                                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                                          : solicitud.estado === "rechazado"
                                          ? "bg-red-100 text-red-800 hover:bg-red-100"
                                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                      }
                                    >
                                      {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {solicitud.estado === "rechazado" && solicitud.motivo_rechazo && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleShowReason(solicitud.motivo_rechazo)}
                                      >
                                        Ver motivo
                                      </Button>
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
      )}
    </>
  )
}