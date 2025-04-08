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
import { AlertCircle, CheckCircle2, Calendar, Download, Plus, FileText, Upload } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function IncapacidadesUsuario() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [incapacidades, setIncapacidades] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    fechaInicio: "",
    fechaFin: "",
    documento: null as File | null
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fileError, setFileError] = useState("")

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const supabase = createSupabaseClient()
    
    // Suscribirse a cambios en la tabla de incapacidades
    const channel = supabase
      .channel('user_incapacidades_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incapacidades',
          filter: `usuario_id=eq.${userData?.auth_user_id}`
        },
        (payload) => {
          // Actualizar la lista de incapacidades cuando haya cambios
          if (payload.eventType === 'INSERT') {
            setIncapacidades(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setIncapacidades(prev =>
              prev.map(inc => inc.id === payload.new.id ? payload.new : inc)
            )
          } else if (payload.eventType === 'DELETE') {
            setIncapacidades(prev =>
              prev.filter(inc => inc.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userData])

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

      // Obtener incapacidades del usuario
      const { data: incapacidadesData, error: incapacidadesError } = await supabase
        .from('incapacidades')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_subida', { ascending: false })

      if (incapacidadesError) {
        console.error("Error al obtener incapacidades:", incapacidadesError)
      } else {
        setIncapacidades(incapacidadesData || [])
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData({ ...formData, documento: file })
    setFileError("")
    
    // Validar que sea un PDF
    if (file && file.type !== 'application/pdf') {
      setFileError("El archivo debe ser un PDF")
    }
    
    // Validar tamaño (máximo 5MB)
    if (file && file.size > 5 * 1024 * 1024) {
      setFileError("El archivo es demasiado grande. Máximo 5MB.")
    }
  }

  const enviarIncapacidad = async () => {
    try {
      // Validar campos requeridos
      if (!formData.fechaInicio || !formData.fechaFin || !formData.documento) {
        setError("Por favor complete todos los campos requeridos y adjunte un documento PDF.")
        return
      }

      // Validar que la fecha de fin sea posterior o igual a la fecha de inicio
      const fechaInicio = new Date(formData.fechaInicio)
      const fechaFin = new Date(formData.fechaFin)
      
      if (fechaFin < fechaInicio) {
        setError("La fecha de fin debe ser posterior o igual a la fecha de inicio.")
        return
      }

      // Validar que el archivo sea un PDF
      if (formData.documento && formData.documento.type !== 'application/pdf') {
        setError("El documento debe ser un archivo PDF.")
        return
      }

      // Validar el tamaño del archivo
      if (formData.documento && formData.documento.size > 5 * 1024 * 1024) {
        setError("El archivo es demasiado grande. El tamaño máximo permitido es 5MB.")
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

      // Subir el documento a Supabase Storage
      const fileHash = `${session.user.id}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
      const fileName = `${fileHash}.pdf`
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('incapacidades')
        .upload(fileName, formData.documento, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        })

      if (uploadError) {
        console.error('Error de carga:', uploadError)
        if (uploadError.message.includes('duplicate')) {
          setError('Ya existe un documento con el mismo nombre. Por favor, intente nuevamente.')
        } else if (uploadError.message.includes('permission')) {
          setError('No tiene permisos para subir documentos. Por favor contacte al administrador.')
        } else {
          setError(`Error al subir el documento: ${uploadError.message}`)
        }
        return
      }

      // Obtener la URL pública del documento
      const { data: urlData } = supabase
        .storage
        .from('incapacidades')
        .getPublicUrl(fileName)

      // Crear el registro de incapacidad en la base de datos
      const { data, error } = await supabase
        .from('incapacidades')
        .insert([{
          usuario_id: session.user.id,
          fecha_inicio: formData.fechaInicio,
          fecha_fin: formData.fechaFin,
          fecha_subida: new Date().toISOString(),
          documento_url: urlData.publicUrl
        }])
        .select()

      if (error) throw error

      // Actualizar la lista de incapacidades
      const { data: incapacidadesData } = await supabase
        .from('incapacidades')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha_subida', { ascending: false })

      setIncapacidades(incapacidadesData || [])
      setSuccess("Incapacidad registrada correctamente.")
      setShowModal(false)
      setFormData({ fechaInicio: "", fechaFin: "", documento: null })
    } catch (err: any) {
      console.error("Error al registrar la incapacidad:", err)
      setError("Error al registrar la incapacidad. Por favor intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const descargarDocumento = async (documentoUrl: string) => {
    try {
      const response = await fetch(documentoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'incapacidad.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al descargar el documento:', error)
      setError('Error al descargar el documento. Por favor intente nuevamente.')
    }
  }

  return (
    <>
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
                        <h1 className="text-2xl font-bold tracking-tight">Mis Incapacidades</h1>
                        <p className="text-muted-foreground">
                          Registra y consulta tus incapacidades médicas
                        </p>
                      </div>
                      <Button onClick={() => setShowModal(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Incapacidad
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
                        <CardTitle>Historial de incapacidades</CardTitle>
                        <CardDescription>
                          Registro de incapacidades médicas presentadas.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha de Inicio</TableHead>
                              <TableHead>Fecha de Fin</TableHead>
                              <TableHead>Fecha de Registro</TableHead>
                              <TableHead>Documento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                  <div className="flex justify-center">
                                    <svg
                                      className="animate-spin h-6 w-6 text-primary"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : incapacidades.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                  No has registrado incapacidades
                                </TableCell>
                              </TableRow>
                            ) : (
                              incapacidades.map((incapacidad) => (
                                <TableRow key={incapacidad.id}>
                                  <TableCell>
                                    {incapacidad.fecha_inicio ? formatDate(incapacidad.fecha_inicio) : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {incapacidad.fecha_fin ? formatDate(incapacidad.fecha_fin) : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {incapacidad.fecha_subida ? formatDate(incapacidad.fecha_subida) : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {incapacidad.documento_url ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => descargarDocumento(incapacidad.documento_url)}
                                        className="flex items-center gap-1"
                                      >
                                        <Download className="h-4 w-4" />
                                        PDF
                                      </Button>
                                    ) : (
                                      "No disponible"
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

        {/* Modal para registrar nueva incapacidad */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Incapacidad</DialogTitle>
              <DialogDescription>
                Complete el formulario para registrar una nueva incapacidad médica.
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="documento" className="text-right">
                  Documento PDF
                </Label>
                <div className="col-span-3">
                  <Input
                    id="documento"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                  {fileError && (
                    <p className="text-sm text-red-500 mt-1">{fileError}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Adjunte el documento de incapacidad en formato PDF (máx. 5MB)
                  </p>
                </div>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={enviarIncapacidad} 
                disabled={loading || !!fileError}
                className="flex items-center gap-1"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Registrar Incapacidad
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
}