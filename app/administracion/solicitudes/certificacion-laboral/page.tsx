"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export default function AdminCertificacionLaboral() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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
          <p>Que el(la) Señor(a) <strong>${usuarioData.colaborador || '(NOMBRE DE EMPLEADO)'}</strong> identificado(a) con cédula de ciudadanía No. <strong>${usuarioData.cedula || '(NUMERO DE CEDULA)'}</strong>, está vinculado(a) a esta empresa desde el <strong>${usuarioData.fecha_ingreso || '(Fecha de ingreso)'}</strong>, donde se desempeña como <strong>${usuarioData.cargo || 'DISEÑADOR GRÁFICO'}</strong>.</p>
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
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Certificación Laboral</h1>
                  <p className="text-muted-foreground">
                    Gestiona las solicitudes pendientes de certificación laboral.
                  </p>
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

                {solicitudes.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p>No hay solicitudes pendientes en este momento.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {solicitudes.map((solicitud) => (
                      <Card key={solicitud.id}>
                        <CardHeader>
                          <CardTitle>{solicitud.usuario.colaborador}</CardTitle>
                          <CardDescription>
                            Cédula: {solicitud.usuario.cedula} | Cargo: {solicitud.usuario.cargo}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p><strong>Dirigido a:</strong> {solicitud.dirigido_a}</p>
                              <p><strong>Ciudad:</strong> {solicitud.ciudad}</p>
                            </div>
                            <div>
                              <p><strong>Fecha solicitud:</strong> {formatDate(new Date(solicitud.fecha_solicitud))}</p>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              const motivo = prompt("Ingrese el motivo del rechazo:")
                              if (motivo) rechazarSolicitud(solicitud.id, motivo)
                            }}
                          >
                            Rechazar
                          </Button>
                          <Button 
                            onClick={() => aprobarSolicitud(solicitud.id, solicitud.usuario)}
                          >
                            Aprobar
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}