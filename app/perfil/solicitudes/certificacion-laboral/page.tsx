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
    salario_contrato: false
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

  // Función para convertir número a texto
  const numeroALetras = (numero: number) => {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (numero === 0) return 'CERO';
    if (numero < 0) return 'MENOS ' + numeroALetras(Math.abs(numero));

    let letras = '';

    // Millones
    if (numero >= 1000000) {
      const millones = Math.floor(numero / 1000000);
      numero %= 1000000;
      letras += numeroALetras(millones) + (millones === 1 ? ' MILLÓN ' : ' MILLONES ');
    }

    // Miles
    if (numero >= 1000) {
      const miles = Math.floor(numero / 1000);
      numero %= 1000;
      letras += (miles === 1 ? 'MIL ' : numeroALetras(miles) + ' MIL ');
    }

    // Centenas
    if (numero >= 100) {
      if (numero === 100) {
        letras += 'CIEN ';
      } else {
        letras += centenas[Math.floor(numero / 100)] + ' ';
      }
      numero %= 100;
    }

    // Decenas y unidades
    if (numero > 0) {
      if (numero < 10) {
        letras += unidades[numero];
      } else if (numero < 20) {
        letras += especiales[numero - 10];
      } else {
        const unidad = numero % 10;
        const decena = Math.floor(numero / 10);
        if (unidad === 0) {
          letras += decenas[decena];
        } else {
          letras += decenas[decena] + ' Y ' + unidades[unidad];
        }
      }
    }

    return letras.trim();
  };

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
          salario_contrato: formData.salario_contrato
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
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Solicitud de Certificación Laboral</h1>
                  <p className="text-muted-foreground">
                    Completa el formulario para solicitar tu certificado laboral.
                  </p>
                </div>

                {/* Tabla de solicitudes */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Mis Solicitudes</CardTitle>
                      <CardDescription>Historial de solicitudes de certificación laboral</CardDescription>
                    </div>
                    <Button
                      onClick={() => setShowModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Nueva solicitud
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Dirigido a</TableHead>
                          <TableHead>Ciudad</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudes.map((solicitud) => (
                          <TableRow key={solicitud.id}>
                            <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                            <TableCell>{solicitud.dirigido_a}</TableCell>
                            <TableCell>{solicitud.ciudad}</TableCell>
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
                                  className="text-sm text-red-500"
                                  onClick={() => handleShowReason(solicitud.motivo_rechazo)}
                                >
                                  Ver motivo
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {solicitudes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              No hay solicitudes registradas
                            </TableCell>
                          </TableRow>
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

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="salario_contrato"
                          checked={formData.salario_contrato}
                          onChange={(e) => setFormData({ ...formData, salario_contrato: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="salario_contrato">Incluir salario y tipo de contrato en el certificado</Label>
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