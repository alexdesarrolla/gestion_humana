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
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function AdminCertificacionLaboral() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showTipoModal, setShowTipoModal] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<{id: string, usuario: any} | null>(null)
  const [showSalarioModal, setShowSalarioModal] = useState(false)
  const [salarioData, setSalarioData] = useState({
    salario: "",
    tipoContrato: "Contrato a término indefinido"
  })
  const [formData, setFormData] = useState({
    cedula: "",
    dirigidoA: "",
    ciudad: "",
    incluirSalario: false
  })
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<any>(null)

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

  const aprobarSolicitud = async (solicitudId: string, usuarioData: any) => {
    try {
      if (!usuarioData || !usuarioData.empresas) {
        setError("Datos del usuario o empresa no disponibles")
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

      // Obtener datos de salario y tipo de contrato del localStorage si existen
      const salario = localStorage.getItem('certificacion_salario')
      const tipoContrato = localStorage.getItem('certificacion_tipoContrato')
      const incluirDatosSalariales = salario && tipoContrato

      // Crear un elemento HTML temporal para renderizar el certificado
      const certificateContainer = document.createElement("div")
      // Configurar dimensiones exactas de tamaño carta (215.9mm x 279.4mm)
      certificateContainer.style.width = "215.9mm"
      certificateContainer.style.height = "279.4mm"
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
      
      // Construir la ruta a la imagen de membrete local
      const empresaId = usuarioData.empresa_id || 1
      const membreteLocalPath = `/img/membrete/membrete-${empresaId}.jpg`
      
      // Definir el estilo del contenedor con la imagen de membrete local
      const containerStyle = `position: relative; width: 215.9mm; height: 279.4mm; background-image: url('${membreteLocalPath}'); background-size: cover; background-repeat: no-repeat; background-position: left top; background-color: rgba(255, 255, 255, 0.8); background-blend-mode: lighten;`
      
      // Obtener los datos de la solicitud
      const { data: solicitudData, error: solicitudError } = await supabase
        .from('solicitudes_certificacion')
        .select('*')
        .eq('id', solicitudId)
        .single()

      if (solicitudError) throw solicitudError

      // Preparar el contenido del certificado
      let certificadoHTML = `
        <div style="${containerStyle}">
          <div style="padding-top: 180px; padding-left: 100px; padding-right: 100px;">
            <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center;">LA DIRECTORA DE TALENTO HUMANO DE ${usuarioData.empresas?.razon_social || 'BEST DATA MARKETING S.A.S'}</h1>
          </div>
        
        <div style="text-align: center; margin: 50px 0; padding-left: 100px; padding-right: 100px;">
          <h2 style="font-size: 16px; font-weight: bold;">CERTIFICA:</h2>
        </div>
        
        <div style="text-align: justify; line-height: 1.6; margin: 30px 0; padding-left: 100px; padding-right: 100px;">
          <p>Que el(la) Señor(a) <strong>${usuarioData.colaborador || '(NOMBRE DE EMPLEADO)'}</strong> identificado(a) con cédula de ciudadanía No. <strong>${usuarioData.cedula || '(NUMERO DE CEDULA)'}</strong>, está vinculado(a) a esta empresa desde el <strong>${usuarioData.fecha_ingreso || '(Fecha de ingreso)'}</strong>, donde se desempeña como <strong>${usuarioData.cargo || 'DISEÑADOR GRÁFICO'}</strong>`
      
      // Agregar información de salario y tipo de contrato si está disponible
      if (incluirDatosSalariales) {
        const salarioFormateado = new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(Number(salario))
        
        certificadoHTML += `, con un salario mensual de <strong>${salarioFormateado}</strong> y vinculado(a) mediante <strong>${tipoContrato}</strong>`
      }
      
      certificadoHTML += `.</p>
        </div>
        
        <div style="text-align: left; margin: 50px 0; padding-left: 100px; padding-right: 100px;">
          <p>Se expide para ${solicitudData.dirigido_a}, en la ciudad de ${solicitudData.ciudad}, ${fechaActual}.</p>
        </div>
        
        <div style="margin-top: 80px; padding-left: 100px; padding-right: 100px;">
          <p>Atentamente,</p>
          <div style="position: relative;">
            <div style="position: relative; height: 100px;">
              <img src="/img/firma/firma-lissette.png" alt="Firma" style="width: 200px; position: absolute; top: 50px; left: 0; z-index: 1;" />
            </div>
            <p style="margin-top: 10px;"><strong>LISSETTE VANESSA CALDERON</strong><br>Directora de Talento Humano<br>${usuarioData.empresas?.razon_social || 'BEST DATA MARKETING S.A.S'}<br>Nit ${usuarioData.empresas?.nit || '901303215-6'}</p>
          </div>
        </div>
      </div>
      `
      
      certificateContainer.innerHTML = certificadoHTML

      document.body.appendChild(certificateContainer)
      // Configurar html2canvas para capturar exactamente el tamaño carta
      // Carta en píxeles a 96 DPI: 816 x 1056 (215.9mm x 279.4mm)
      const canvas = await html2canvas(certificateContainer, {
        scale: 2, // Mayor escala para mejor calidad
        useCORS: true,
        logging: false,
        width: 816, // Ancho exacto de carta en píxeles (215.9mm)
        height: 1056, // Alto exacto de carta en píxeles (279.4mm)
        windowWidth: 816,
        windowHeight: 1056
      })
      document.body.removeChild(certificateContainer)

      // Crear documento PDF con formato carta estándar
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter", // Formato carta estándar (215.9mm x 279.4mm)
        compress: true // Comprimir para reducir tamaño
      })

      // Convertir canvas a imagen con alta calidad
      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      
      // Obtener dimensiones exactas del PDF
      const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
      
      // Añadir imagen al PDF ajustando al tamaño exacto de A4
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

        // Limpiar localStorage después de generar el PDF
        localStorage.removeItem('certificacion_salario')
        localStorage.removeItem('certificacion_tipoContrato')

        setSuccess("Solicitud aprobada y certificado generado correctamente.")
        setSolicitudes(solicitudes.filter(s => s.id !== solicitudId))
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
            estado: 'pendiente',
            salario_contrato: formData.incluirSalario ? "Si" : "No"
          }
        ])
        .select()
        .single()

      if (solicitudError) throw solicitudError

      // Si se incluye salario y tipo de contrato, guardar en localStorage
      if (formData.incluirSalario) {
        localStorage.setItem('certificacion_salario', salarioData.salario);
        localStorage.setItem('certificacion_tipoContrato', salarioData.tipoContrato);
      }

      // Aprobar la solicitud inmediatamente
      await aprobarSolicitud(solicitudData.id, usuarioEncontrado)

      setShowModal(false)
      setFormData({ cedula: "", dirigidoA: "", ciudad: "", incluirSalario: false })
      setSalarioData({ salario: "", tipoContrato: "Contrato a término indefinido" })
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
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Certificación Laboral</h1>
                    <p className="text-muted-foreground">
                      Gestiona las solicitudes pendientes de certificación laboral.
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
                          <TableHead>Dirigido a</TableHead>
                          <TableHead>Ciudad</TableHead>
                          <TableHead>SyT</TableHead>
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
                              <TableCell>{formatDate(new Date(solicitud.fecha_solicitud))}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      const motivo = prompt("Ingrese el motivo del rechazo:")
                                      if (motivo) rechazarSolicitud(solicitud.id, motivo)
                                    }}
                                  >
                                    Rechazar
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={() => {
                                      setSolicitudSeleccionada({id: solicitud.id, usuario: solicitud.usuario})
                                      // Verificar si el certificado requiere información salarial
                                      if (solicitud.salario_contrato === "Si") {
                                        // Si requiere salario, mostrar el modal de salario
                                        setShowSalarioModal(true)
                                      } else {
                                        // Si no requiere salario, generar directamente el PDF
                                        aprobarSolicitud(solicitud.id, solicitud.usuario)
                                      }
                                    }}
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

                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="incluirSalario"
                          checked={formData.incluirSalario}
                          onChange={(event) => {
                            console.log('Checkbox changed:', event.target.checked);
                            setFormData({ ...formData, incluirSalario: event.target.checked });
                          }}
                        />
                        <Label htmlFor="incluirSalario" className="cursor-pointer" onClick={() => {
                          setFormData({ ...formData, incluirSalario: !formData.incluirSalario });
                        }}>Con salario y tipo de contrato</Label>
                      </div>

                      {formData.incluirSalario && (
                        <div className="space-y-4 p-4 border rounded-md">
                          <div className="space-y-2">
                            <Label htmlFor="salario">Salario</Label>
                            <Input
                              id="salario"
                              type="number"
                              value={salarioData.salario}
                              onChange={(e) => setSalarioData({ ...salarioData, salario: e.target.value })}
                              placeholder="Ingrese el salario"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
                            <Select 
                              value={salarioData.tipoContrato} 
                              onValueChange={(value) => setSalarioData({ ...salarioData, tipoContrato: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione el tipo de contrato" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Contrato a Término Fijo">Contrato a Término Fijo</SelectItem>
                                <SelectItem value="Contrato a término indefinido">Contrato a término indefinido</SelectItem>
                                <SelectItem value="Contrato de Obra o labor">Contrato de Obra o labor</SelectItem>
                                <SelectItem value="Contrato civil por prestación de servicios">Contrato civil por prestación de servicios</SelectItem>
                                <SelectItem value="Contrato de aprendizaje">Contrato de aprendizaje</SelectItem>
                                <SelectItem value="Contrato ocasional de trabajo">Contrato ocasional de trabajo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

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

                {/* Modal para seleccionar tipo de certificación */}
                <Dialog open={showTipoModal} onOpenChange={setShowTipoModal}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tipo de Certificación</DialogTitle>
                      <DialogDescription>
                        Seleccione el tipo de certificación que desea generar
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4">
                        <Button 
                          onClick={() => {
                            setShowTipoModal(false)
                            if (solicitudSeleccionada) {
                              aprobarSolicitud(solicitudSeleccionada.id, solicitudSeleccionada.usuario)
                            }
                          }}
                          className="py-6"
                        >
                          Sin Salario y tipo de contrato
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowTipoModal(false)
                            if (solicitudSeleccionada) {
                              // Abrir el modal de salario y tipo de contrato
                              setShowSalarioModal(true)
                            }
                          }}
                          className="py-6"
                        >
                          Con Salario y tipo de contrato
                        </Button>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setShowTipoModal(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Modal para ingresar salario y tipo de contrato */}
                <Dialog open={showSalarioModal} onOpenChange={setShowSalarioModal}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Información Salarial y Contractual</DialogTitle>
                      <DialogDescription>
                        Ingrese el salario y tipo de contrato para incluir en la certificación
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="salario">Salario</Label>
                        <Input
                          id="salario"
                          type="number"
                          value={salarioData.salario}
                          onChange={(e) => setSalarioData({ ...salarioData, salario: e.target.value })}
                          placeholder="Ingrese el salario"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
                        <Select 
                          value={salarioData.tipoContrato} 
                          onValueChange={(value) => setSalarioData({ ...salarioData, tipoContrato: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo de contrato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Contrato a Término Fijo">Contrato a Término Fijo</SelectItem>
                            <SelectItem value="Contrato a término indefinido">Contrato a término indefinido</SelectItem>
                            <SelectItem value="Contrato de Obra o labor">Contrato de Obra o labor</SelectItem>
                            <SelectItem value="Contrato civil por prestación de servicios">Contrato civil por prestación de servicios</SelectItem>
                            <SelectItem value="Contrato de aprendizaje">Contrato de aprendizaje</SelectItem>
                            <SelectItem value="Contrato ocasional de trabajo">Contrato ocasional de trabajo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowSalarioModal(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={() => {
                            // Guardar datos en localStorage
                            localStorage.setItem('certificacion_salario', salarioData.salario);
                            localStorage.setItem('certificacion_tipoContrato', salarioData.tipoContrato);
                            
                            // Cerrar modal y generar certificado
                            setShowSalarioModal(false);
                            if (solicitudSeleccionada) {
                              aprobarSolicitud(solicitudSeleccionada.id, solicitudSeleccionada.usuario);
                            }
                          }} 
                          disabled={!salarioData.salario || !salarioData.tipoContrato}
                        >
                          Generar certificación
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