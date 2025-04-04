"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, FileText, Download, Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export default function CertificacionLaboral() {
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleShowReason = (reason: string) => {
    setRejectionReason(reason)
    setShowReasonModal(true)
  }

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    dirigidoA: "",
    ciudad: "",
    incluirSalario: false,
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
        .from('solicitudes_certificacion')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      if (solicitudesError) {
        console.error("Error al obtener solicitudes:", solicitudesError)
      } else {
        setSolicitudes(solicitudesData)
      }

      setUserData(userData)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('es-CO', options)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const enviarSolicitud = async () => {
    if (!formData.dirigidoA || !formData.ciudad) {
      setError("Por favor complete todos los campos requeridos.")
      return
    }

    try {
      setGeneratingPdf(true)
      setError("")
      
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      // Crear la solicitud en la base de datos
      const { data, error } = await supabase
        .from('solicitudes_certificacion')
        .insert([{
          usuario_id: session.user.id,
          dirigido_a: formData.dirigidoA,
          ciudad: formData.ciudad,
          estado: 'pendiente',
          salario_contrato: formData.incluirSalario ? "Si" : "No"
        }])
        .select()

      if (error) throw error

      // Actualizar la lista de solicitudes
      const { data: solicitudesData } = await supabase
        .from('solicitudes_certificacion')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_solicitud', { ascending: false })

      setSolicitudes(solicitudesData || [])
      setSuccess("Solicitud de certificado enviada correctamente. Espera la aprobación del administrador.")
    } catch (err: any) {
      console.error("Error al enviar la solicitud:", err)
      setError("Error al enviar la solicitud. Por favor intente nuevamente.")
    } finally {
      setGeneratingPdf(false)
    }
  }

  const descargarCertificado = async (pdfUrl: string) => {
    try {
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'certificado-laboral.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al descargar el certificado:', error)
      setError('Error al descargar el certificado. Por favor intente nuevamente.')
    }
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
      {loading && !userData ? (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
          <div className="text-2xl font-semibold text-gray-700">Cargando...</div>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50">
          <Sidebar userName={userData?.colaborador} />
      <Sidebar userName={userData?.colaborador} />

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Certificación Laboral</h1>
                    <p className="text-muted-foreground">
                      Historial de solicitudes de certificación laboral
                    </p>
                  </div>
                  <Button onClick={() => setShowModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva solicitud
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
                
                {/* Tabla de solicitudes */}
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Dirigido a</TableHead>
                          <TableHead>Ciudad</TableHead>
                          <TableHead>Incluye Salario</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center">
                              No hay solicitudes registradas
                            </TableCell>
                          </TableRow>
                        ) : (
                          solicitudes.map((solicitud) => (
                            <TableRow key={solicitud.id}>
                              <TableCell>{formatDate(new Date(solicitud.fecha_solicitud))}</TableCell>
                              <TableCell>{solicitud.dirigido_a}</TableCell>
                              <TableCell>{solicitud.ciudad}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={solicitud.salario_contrato === "Si" ? "secondary" : "destructive"}
                                  className={solicitud.salario_contrato === "Si" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
                                >
                                  {solicitud.salario_contrato || "No"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={solicitud.estado === 'aprobado' ? 'success' :
                                          solicitud.estado === 'rechazado' ? 'destructive' :
                                          'default'}
                                >
                                  {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {solicitud.estado === 'aprobado' && solicitud.pdf_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => descargarCertificado(solicitud.pdf_url)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Descargar
                                  </Button>
                                )}
                                
                                {solicitud.estado === 'rechazado' && solicitud.motivo_rechazo && (
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

                {/* Modal de nueva solicitud */}
                <Dialog open={showModal} onOpenChange={setShowModal}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Solicitud de Certificación</DialogTitle>
                      <DialogDescription>
                        Complete el formulario para solicitar su certificado laboral
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="dirigidoA">A quien es dirigido</Label>
                        <Input
                          id="dirigidoA"
                          placeholder="Ej: Banco Davivienda, Universidad Nacional, etc."
                          value={formData.dirigidoA}
                          onChange={(e) => setFormData({ ...formData, dirigidoA: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ciudad">Ciudad</Label>
                        <Input
                          id="ciudad"
                          placeholder="Ej: Bogotá, Medellín, Cali, etc."
                          value={formData.ciudad}
                          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2 py-2">
                        <Label className="block mb-2">¿Incluir salario y tipo de contrato en la certificación?</Label>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Label htmlFor="opcionSi" className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                type="radio" 
                                id="opcionSi" 
                                name="incluirSalarioOpcion" 
                                className="h-4 w-4"
                                checked={formData.incluirSalario === true}
                                onChange={() => setFormData({ ...formData, incluirSalario: true })}
                              />
                              <span>Sí</span>
                            </Label>
                          </div>
                          <div className="flex items-center">
                            <Label htmlFor="opcionNo" className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                type="radio" 
                                id="opcionNo" 
                                name="incluirSalarioOpcion" 
                                className="h-4 w-4"
                                checked={formData.incluirSalario === false}
                                onChange={() => setFormData({ ...formData, incluirSalario: false })}
                              />
                              <span>No</span>
                            </Label>
                          </div>
                        </div>
                      </div>

                      <Button 
                        type="button" 
                        className="w-full flex items-center justify-center gap-2" 
                        onClick={enviarSolicitud}
                        disabled={generatingPdf}
                      >
                        {generatingPdf ? (
                          <>
                            <span className="animate-spin mr-1">⏳</span>
                            Generando PDF...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Generar Certificado Laboral
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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