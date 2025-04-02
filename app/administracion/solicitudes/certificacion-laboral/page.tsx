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
import { AlertCircle, CheckCircle2, FileText, Plus } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export default function AdminCertificacionLaboral() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    cedula: "",
    dirigidoA: "",
    ciudad: ""
  })
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<any>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalData, setApprovalData] = useState({
    salario: '',
    tipoContrato: '',
    incluirSalario: true,
    incluirContrato: true
  })
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null)

  // Obtener solicitudes pendientes
  useEffect(() => {
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase
          .from('solicitudes_certificacion')
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

  const aprobarSolicitud = async (solicitudId: string, usuarioData: any) => {
    try {
      if (!usuarioData || !usuarioData.empresas || 
          (approvalData.incluirSalario && !approvalData.salario) || 
          (approvalData.incluirContrato && !approvalData.tipoContrato)) {
        setError("Datos del usuario, empresa o campos requeridos no disponibles")
        return
      }

      setLoading(true)
      setError("")
      
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      // Crear un elemento HTML temporal para renderizar el certificado
      const certificateContainer = document.createElement("div")
      certificateContainer.style.width = "210mm"
      certificateContainer.style.height = "297mm"
      certificateContainer.style.padding = "0"
      certificateContainer.style.margin = "0"
      certificateContainer.style.overflow = "hidden"
      certificateContainer.style.fontFamily = "Arial, sans-serif"
      certificateContainer.style.position = "absolute"
      certificateContainer.style.left = "-9999px"
      
      const fechaActual = formatDate(new Date())
      const empresaNombre = usuarioData.empresas.nombre || 'BDATAM'
      const membreteFileName = `membrete-${empresaNombre.toLowerCase().replace(/\s+/g, "-")}.jpg`
      const membreteUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/empresas/logos/${membreteFileName}`
      
      // Verificar si existe el membrete
      const { data: membreteExists } = await supabase
        .storage
        .from('empresas')
        .list(`logos/${membreteFileName}`)

      // Definir el estilo del contenedor según la existencia del membrete
      const containerStyle = membreteExists && membreteExists.length > 0
        ? `position: relative; width: 210mm; height: 297mm; background-image: url('${membreteUrl}'); background-size: cover; background-repeat: no-repeat; background-position: left top; background-color: rgba(255, 255, 255, 0.8); background-blend-mode: lighten;`
        : `position: relative; width: 210mm; height: 297mm; background-color: white;`
      
      // Obtener los datos de la solicitud
      const { data: solicitudData, error: solicitudError } = await supabase
        .from('solicitudes_certificacion')
        .select('*')
        .eq('id', solicitudId)
        .single()

      if (solicitudError) throw solicitudError

      certificateContainer.innerHTML = `
        <div style="${containerStyle}">
          <div style="padding-top: 180px; padding-left: 100px; padding-right: 100px;">
            <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center;">LA DIRECTORA DE TALENTO HUMANO DE ${usuarioData.empresas?.razon_social || 'BEST DATA MARKETING S.A.S'}</h1>
          </div>
        
        <div style="text-align: center; margin: 50px 0; padding-left: 100px; padding-right: 100px;">
          <h2 style="font-size: 16px; font-weight: bold;">CERTIFICA:</h2>
        </div>
        
        <div style="text-align: justify; line-height: 1.6; margin: 30px 0; padding-left: 100px; padding-right: 100px;">
          <p>Que el(la) Señor(a) <strong>${usuarioData.colaborador || '(NOMBRE DE EMPLEADO)'}</strong> identificado(a) con cédula de ciudadanía No. <strong>${usuarioData.cedula || '(NUMERO DE CEDULA)'}</strong>, está vinculado(a) a esta empresa desde el <strong>${usuarioData.fecha_ingreso || '(Fecha de ingreso)'}</strong>, donde se desempeña como <strong>${usuarioData.cargo || 'DISEÑADOR GRÁFICO'}</strong>${approvalData.incluirContrato ? `, con contrato <strong>${approvalData.tipoContrato}</strong>` : ''}${approvalData.incluirSalario ? ` y un salario mensual de <strong>${formatCurrency(Number(approvalData.salario))}</strong> (${numeroALetras(Number(approvalData.salario))} PESOS M/CTE)` : ''}.</p>
        </div>
        
        <div style="text-align: left; margin: 50px 0; padding-left: 100px; padding-right: 100px;">
          <p>Se expide para el (${solicitudData.dirigido_a}), en la ciudad de ${solicitudData.ciudad}, ${fechaActual}.</p>
        </div>
        
        <div style="margin-top: 80px; padding-left: 100px; padding-right: 100px;">
          <p>Atentamente,</p>
          <div style="margin-top: 60px; border-bottom: 1px solid #000; width: 250px;"></div>
          <p style="margin-top: 10px;"><strong>LISSETTE VANESSA CALDERON</strong><br>Directora de Talento Humano<br>${usuarioData.empresas?.razon_social || 'BEST DATA MARKETING S.A.S'}<br>Nit ${usuarioData.empresas?.nit || '901303215-6'}</p>
        </div>
      </div>
      `

      document.body.appendChild(certificateContainer)
      const canvas = await html2canvas(certificateContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 793,
        height: 1122,
        windowWidth: 793,
        windowHeight: 1122
      })
      document.body.removeChild(certificateContainer)

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        margins: { top: 10, right: 25, bottom: 10, left: 25 }
      })

      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)

      // Intentar subir directamente el PDF sin verificar el bucket
      // Si hay un error específico relacionado con el bucket, se manejará en el catch

      // Subir el PDF a Supabase Storage con manejo de errores específico
      try {
        const pdfBlob = pdf.output("blob")
        const fileName = `certificados/${solicitudId}.pdf`
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('certificados')
          .upload(fileName, pdfBlob, {
            upsert: true,
            cacheControl: '3600'
          })

        if (uploadError) {
          if (uploadError.message.includes('row-level security')) {
            throw new Error('No tienes permisos para subir archivos. Por favor contacta al administrador.')
          }
          throw uploadError
        }

        // Obtener URL pública del PDF
        const { data: urlData } = supabase
          .storage
          .from('certificados')
          .getPublicUrl(fileName)

        // Actualizar la solicitud como aprobada
        const { error } = await supabase
          .from('solicitudes_certificacion')
          .update({
            estado: 'aprobado',
            admin_id: session.user.id,
            fecha_resolucion: new Date(),
            pdf_url: urlData.publicUrl
          })
          .eq('id', solicitudId)

        if (error) throw error

        setSuccess("Solicitud aprobada y certificado generado correctamente.")
        setSolicitudes(solicitudes.filter(s => s.id !== solicitudId))
        setShowApprovalModal(false)
        setApprovalData({ salario: '', tipoContrato: '' })
      } catch (err: any) {
        throw err
      }
    } catch (err: any) {
      console.error("Error al aprobar solicitud:", err)
      setError(err.message || "Error al procesar la solicitud")
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
        .from('solicitudes_certificacion')
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
    } catch (err) {
      console.error("Error al rechazar solicitud:", err)
      setError("Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  const buscarUsuario = async () => {
    if (!formData.cedula) {
      setError("Por favor ingrese un número de cédula")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('usuario_nomina')
        .select(`
          *,
          empresas:empresa_id(nombre, razon_social, nit)
        `)
        .eq('cedula', formData.cedula)
        .single()

      if (error) throw error
      setUsuarioEncontrado(data)
    } catch (err) {
      console.error("Error al buscar usuario:", err)
      setError("No se encontró ningún usuario con esa cédula")
      setUsuarioEncontrado(null)
    } finally {
      setLoading(false)
    }
  }

  const crearCertificado = async () => {
    if (!usuarioEncontrado || !formData.dirigidoA || !formData.ciudad) {
      setError("Por favor complete todos los campos requeridos")
      return
    }

    try {
      setLoading(true)
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      // Crear la solicitud y aprobarla automáticamente
      const { data: solicitudData, error: solicitudError } = await supabase
        .from('solicitudes_certificacion')
        .insert([
          {
            usuario_id: session.user.id,
            dirigido_a: formData.dirigidoA,
            ciudad: formData.ciudad,
            estado: 'pendiente'
          }
        ])
        .select()
        .single()

      if (solicitudError) throw solicitudError

      // Aprobar la solicitud inmediatamente
      await aprobarSolicitud(solicitudData.id, usuarioEncontrado)

      setShowModal(false)
      setFormData({ cedula: "", dirigidoA: "", ciudad: "" })
      setUsuarioEncontrado(null)
    } catch (err) {
      console.error("Error al crear certificado:", err)
      setError("Error al crear el certificado")
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

      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Certificación Laboral</h1>
                    <p className="text-muted-foreground">
                      Gestiona las solicitudes pendientes de certificación laboral.
                    </p>
                  </div>
                  <Button onClick={() => setShowModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Certificación
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
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Dirigido a</TableHead>
                          <TableHead>Ciudad</TableHead>
                          <TableHead>Fecha solicitud</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center">
                              No hay solicitudes pendientes en este momento.
                            </TableCell>
                          </TableRow>
                        ) : (
                          solicitudes.map((solicitud) => (
                            <TableRow key={solicitud.id}>
                              <TableCell>{solicitud.usuario.colaborador}</TableCell>
                              <TableCell>{solicitud.usuario.cedula}</TableCell>
                              <TableCell>{solicitud.usuario.cargo}</TableCell>
                              <TableCell>{solicitud.dirigido_a}</TableCell>
                              <TableCell>{solicitud.ciudad}</TableCell>
                              <TableCell>{formatDate(new Date(solicitud.fecha_solicitud))}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    // Guardar la solicitud actual para usarla en el modal
                                    setSolicitudSeleccionada(solicitud);
                                    setShowApprovalModal(true);
                                  }}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Aprobar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Dialog open={showModal} onOpenChange={setShowModal}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Certificación Laboral</DialogTitle>
                      <DialogDescription>
                        Ingrese los datos para generar un nuevo certificado laboral
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cedula">Número de Cédula</Label>
                        <div className="flex gap-2">
                          <Input
                            id="cedula"
                            value={formData.cedula}
                            onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                            placeholder="Ingrese el número de cédula"
                          />
                          <Button onClick={buscarUsuario} disabled={loading}>
                            Buscar
                          </Button>
                        </div>
                      </div>

                      {usuarioEncontrado && (
                        <div className="space-y-2 p-4 bg-slate-50 rounded-md">
                          <p><strong>Nombre:</strong> {usuarioEncontrado.colaborador}</p>
                          <p><strong>Cargo:</strong> {usuarioEncontrado.cargo}</p>
                          <p><strong>Empresa:</strong> {usuarioEncontrado.empresas?.razon_social}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="dirigidoA">Dirigido a</Label>
                        <Input
                          id="dirigidoA"
                          value={formData.dirigidoA}
                          onChange={(e) => setFormData({ ...formData, dirigidoA: e.target.value })}
                          placeholder="Ingrese a quién va dirigido"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ciudad">Ciudad</Label>
                        <Input
                          id="ciudad"
                          value={formData.ciudad}
                          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                          placeholder="Ingrese la ciudad"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={crearCertificado} disabled={loading || !usuarioEncontrado}>
                          Crear Certificado
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Detalles de Aprobación</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Salario del Empleado</Label>
                        <Input
                          type="text"
                          value={approvalData.salario}
                          onChange={(e) => setApprovalData({ ...approvalData, salario: e.target.value })}
                        />
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="checkbox"
                            id="incluirSalario"
                            checked={approvalData.incluirSalario}
                            onChange={(e) => setApprovalData({ ...approvalData, incluirSalario: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor="incluirSalario" className="text-sm font-normal">Incluir salario en el certificado</Label>
                        </div>
                      </div>
                      <div>
                        <Label>Tipo de Contrato</Label>
                        <Input
                          type="text"
                          value={approvalData.tipoContrato}
                          onChange={(e) => setApprovalData({ ...approvalData, tipoContrato: e.target.value })}
                        />
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="checkbox"
                            id="incluirContrato"
                            checked={approvalData.incluirContrato}
                            onChange={(e) => setApprovalData({ ...approvalData, incluirContrato: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor="incluirContrato" className="text-sm font-normal">Incluir tipo de contrato en el certificado</Label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={() => {
                          if (solicitudSeleccionada) {
                            aprobarSolicitud(solicitudSeleccionada.id, solicitudSeleccionada.usuario);
                          } else {
                            setError("No se ha seleccionado ninguna solicitud para aprobar");
                            setShowApprovalModal(false);
                          }
                        }}>
                          Aprobar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}