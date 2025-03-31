"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { createSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export default function CertificacionLaboral() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [formData, setFormData] = useState({
    dirigidoA: "",
    ciudad: "",
    incluirSalario: true, // Nueva opción para incluir o no el salario
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

  const generatePDF = async () => {
    if (!formData.dirigidoA || !formData.ciudad) {
      setError("Por favor complete todos los campos requeridos.")
      return
    }

    try {
      setGeneratingPdf(true)
      setError("")

      // Crear un elemento HTML temporal para renderizar el certificado
      const certificateContainer = document.createElement("div")
      // Configurar dimensiones exactas de A4 (210mm x 297mm)
      certificateContainer.style.width = "210mm" // Ancho de tamaño A4
      certificateContainer.style.height = "297mm" // Alto de tamaño A4
      certificateContainer.style.padding = "0" // Sin padding para mantener dimensiones exactas
      certificateContainer.style.margin = "0" // Sin margen para mantener dimensiones exactas
      certificateContainer.style.overflow = "hidden" // Evitar desbordamiento
      certificateContainer.style.fontFamily = "Arial, sans-serif"
      certificateContainer.style.position = "absolute"
      certificateContainer.style.left = "-9999px"
      
      // Obtener la fecha actual formateada
      const fechaActual = formatDate(new Date())

      // Formatear el salario
      const salario = userData?.salario ? formatCurrency(userData.salario) : '(VALOR DE SALARIO)';
      const salarioEnLetras = userData?.salario ? numeroALetras(userData.salario) + ' PESOS M/CTE' : '(VALOR DE SUELDO ESCRITO)';
      
      // Preparar la parte del salario (condicional)
      const salarioParte = formData.incluirSalario 
        ? `, devengando un salario básico de <strong>${salario}</strong> (<strong>${salarioEnLetras}</strong>)` 
        : '';

      // Construir la URL del membrete desde el storage de Supabase
      const supabase = createSupabaseClient()
      const empresaNombre = userData?.empresas?.nombre || 'BDATAM'
      const membreteFileName = `membrete-${empresaNombre.toLowerCase().replace(/\s+/g, "-")}.jpg`
      const membreteUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/empresas/logos/${membreteFileName}`
      
      // Contenido del certificado basado en la plantilla proporcionada con membrete como fondo
      certificateContainer.innerHTML = `
        <div style="position: relative; width: 210mm; height: 297mm; background-image: url('${membreteUrl}'); background-size: cover; background-repeat: no-repeat; background-position: left top; background-color: rgba(255, 255, 255, 0.8); background-blend-mode: lighten;">
          <div style="padding-top: 180px; padding-left: 100px; padding-right: 100px;">
            <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center;">LA DIRECTORA DE TALENTO HUMANO DE ${userData?.empresas?.razon_social || 'BEST DATA MARKETING S.A.S'}</h1>
          </div>
        
        <div style="text-align: center; margin: 50px 0; padding-left: 100px; padding-right: 100px;">
          <h2 style="font-size: 16px; font-weight: bold;">CERTIFICA:</h2>
        </div>
        
        <div style="text-align: justify; line-height: 1.6; margin: 30px 0; padding-left: 100px; padding-right: 100px;">
          <p>Que el(la) Señor(a) <strong>${userData?.colaborador || '(NOMBRE DE EMPLEADO)'}</strong> identificado(a) con cédula de ciudadanía No. <strong>${userData?.cedula || '(NUMERO DE CEDULA)'}</strong>, está vinculado(a) a esta empresa mediante contrato de trabajo a <strong>TÉRMINO INDEFINIDO</strong> desde el <strong>${userData?.fecha_ingreso || '(Fecha de ingreso)'}</strong>, donde se desempeña como <strong>${userData?.cargo || 'DISEÑADOR GRÁFICO'}</strong>${salarioParte}.</p>
        </div>
        
        <div style="text-align: left; margin: 50px 0; padding-left: 100px; padding-right: 100px;">
          <p>Se expide para el (${formData.dirigidoA}), en la ciudad de ${formData.ciudad}, ${fechaActual}.</p>
        </div>
        
        <div style="margin-top: 80px; padding-left: 100px; padding-right: 100px;">
          <p>Atentamente,</p>
          <div style="margin-top: 60px; border-bottom: 1px solid #000; width: 250px;"></div>
          <p style="margin-top: 10px;"><strong>LISSETTE VANESSA CALDERON</strong><br>Directora de Talento Humano<br>${userData?.empresas?.razon_social || 'BEST DATA MARKETING S.A.S'}<br>Nit ${userData?.empresas?.nit || '901303215-6'}</p>
        </div>
      </div>
      `

      // Agregar el elemento al DOM para renderizarlo
      document.body.appendChild(certificateContainer)

      // Convertir el HTML a canvas con dimensiones precisas para A4
      const canvas = await html2canvas(certificateContainer, {
        scale: 2, // Mayor calidad
        useCORS: true,
        logging: false,
        width: 793, // Equivalente a 210mm a 96dpi
        height: 1122, // Equivalente a 297mm a 96dpi
        windowWidth: 793,
        windowHeight: 1122
      })

      // Eliminar el elemento temporal
      document.body.removeChild(certificateContainer)

      // Crear el PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4", // Tamaño A4 (210 x 297 mm)
        margins: { top: 10, right: 25, bottom: 10, left: 25 } // Mantener márgenes laterales
      })

      // Añadir la imagen del canvas al PDF con ajuste preciso para A4
      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      
      // Dimensiones del PDF en mm (A4)
      const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
      
      // Usar las dimensiones completas del PDF para la imagen
      // Esto asegura que la imagen ocupe exactamente el tamaño A4
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)

      // Guardar el PDF
      pdf.save(`Certificado_Laboral_${userData?.colaborador.replace(/\s+/g, "_")}.pdf`)

      setSuccess("Certificado laboral generado correctamente.")
    } catch (err: any) {
      console.error("Error al generar el PDF:", err)
      setError("Error al generar el certificado. Por favor intente nuevamente.")
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading && !userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="text-2xl font-semibold text-gray-700">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
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

                <Card>
                  <CardHeader>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
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

                      <div className="flex items-center space-x-2 pt-2">
                        <input
                          type="checkbox"
                          id="incluirSalario"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={formData.incluirSalario}
                          onChange={(e) => setFormData({ ...formData, incluirSalario: e.target.checked })}
                        />
                        <Label htmlFor="incluirSalario" className="text-sm font-medium text-gray-700">
                          Incluir información de salario en el certificado
                        </Label>
                      </div>

                      <CardFooter className="px-0 pt-4">
                        <Button 
                          type="button" 
                          className="w-full flex items-center justify-center gap-2" 
                          onClick={generatePDF}
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
                      </CardFooter>
                    </div>
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