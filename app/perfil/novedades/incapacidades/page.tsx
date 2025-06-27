"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Sidebar } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  Download,
  Plus,
  Upload,
  MessageSquare,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ComentariosIncapacidades } from "@/components/incapacidades/comentarios-incapacidades"

export default function IncapacidadesUsuario() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null) // perfil de usuario_nomina
  const [sessionUserId, setSessionUserId] = useState<string | null>(null) // auth user ID
  const [incapacidades, setIncapacidades] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    fechaInicio: "",
    fechaFin: "",
    documento: null as File | null,
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fileError, setFileError] = useState("")

  // Comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentIncapacidadComent, setCurrentIncapacidadComent] = useState<string | null>(null)
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})

  // Formatea fecha
  const formatDate = (date: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(date + 'T00:00:00').toLocaleDateString("es-CO", options)
  }

  // Función para contar comentarios no vistos por el usuario
  const fetchUserUnseenCount = async (incId: string) => {
    if (!sessionUserId) return
    const { count, error: cntErr } = await supabase
      .from("comentarios_incapacidades")
      .select("*", { head: true, count: "exact" })
      .eq("incapacidad_id", incId)
      .eq("visto_usuario", false)
      .neq("usuario_id", sessionUserId)
    if (!cntErr) {
      setUnseenCounts((prev) => ({ ...prev, [incId]: count || 0 }))
    }
  }

  // Carga inicial: auth, perfil e incapacidades
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        router.push("/login")
        return
      }
      setSessionUserId(session.user.id)

      // Obtener perfil de usuario_nomina
      const { data: usuario, error: userError } = await supabase
        .from("usuario_nomina")
        .select(`*, empresas:empresa_id(nombre, razon_social, nit), sedes:sede_id(nombre)`)
        .eq("auth_user_id", session.user.id)
        .single()
      if (userError) {
        console.error(userError)
      } else {
        setUserData(usuario)
      }

      // Obtener incapacidades del usuario
      const { data: incs, error: incError } = await supabase
        .from("incapacidades")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("fecha_subida", { ascending: false })
      if (incError) {
        console.error(incError)
      } else {
        setIncapacidades(incs || [])
        // Inicializar contador de no leídos
        incs?.forEach((inc) => {
          if (typeof inc.id === 'string') {
            fetchUserUnseenCount(inc.id)
          }
        })
      }

      setLoading(false)
    }
    init()
  }, [router, supabase])

  // Realtime: actualizar contador cuando llega un nuevo comentario
  useEffect(() => {
    if (!sessionUserId) return
    const channel = supabase
      .channel("user_comments_incapacidades")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comentarios_incapacidades",
        },
        (payload) => {
          const nuevo = payload.new as any
          // Si no lo escribió este usuario, aumentar contador
          if (nuevo.usuario_id !== sessionUserId) {
            setUnseenCounts((prev) => ({
              ...prev,
              [nuevo.incapacidad_id]: (prev[nuevo.incapacidad_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionUserId, supabase])

  // Manejador al abrir comentarios: marcar como vistos y resetear contador
  const openComments = async (incId: string) => {
    if (sessionUserId) {
      await supabase
        .from("comentarios_incapacidades")
        .update({ visto_usuario: true })
        .eq("incapacidad_id", incId)
        .eq("visto_usuario", false)
        .neq("usuario_id", sessionUserId)
    }
    setUnseenCounts((prev) => ({ ...prev, [incId]: 0 }))
    setCurrentIncapacidadComent(incId)
    setShowCommentsModal(true)
  }

  // Manejadores de formulario de nueva incapacidad...
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((f) => ({ ...f, documento: file }))
    setFileError("")
    if (file && file.type !== "application/pdf") {
      setFileError("El archivo debe ser un PDF")
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setFileError("Máximo 5MB")
    }
  }

  const enviarIncapacidad = async () => {
    try {
      if (!formData.fechaInicio || !formData.fechaFin || !formData.documento) {
        setError("Complete todos los campos y adjunte un PDF.")
        return
      }
      const fi = new Date(formData.fechaInicio)
      const ff = new Date(formData.fechaFin)
      if (ff < fi) {
        setError("La fecha de fin debe ser igual o posterior a la de inicio.")
        return
      }
      if (formData.documento.type !== "application/pdf") {
        setError("El documento debe ser PDF.")
        return
      }
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")

      const fileName = `${session.user.id}_${Date.now().toString(36)}.pdf`
      const { error: uploadError } = await supabase
        .storage.from("incapacidades")
        .upload(fileName, formData.documento, { upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("incapacidades").getPublicUrl(fileName)
      const { error: dbError } = await supabase
        .from("incapacidades")
        .insert([{
          usuario_id: session.user.id,
          fecha_inicio: formData.fechaInicio,
          fecha_fin: formData.fechaFin,
          fecha_subida: new Date().toISOString(),
          documento_url: urlData.publicUrl,
        }])
      if (dbError) throw dbError

      // Refrescar lista y contadores
      const { data: incs } = await supabase
        .from("incapacidades")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("fecha_subida", { ascending: false })
      setIncapacidades(incs || [])
      incs?.forEach((inc) => {
        if (typeof inc.id === 'string') {
          fetchUserUnseenCount(inc.id)
        }
      })

      setSuccess("Incapacidad registrada correctamente.")
      setShowModal(false)
      setFormData({ fechaInicio: "", fechaFin: "", documento: null })
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Error al registrar incapacidad.")
    } finally {
      setLoading(false)
    }
  }

  const descargarDocumento = async (url: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = "incapacidad.pdf"
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      setError("Error al descargar documento.")
    }
  }

  return (
    <>
      {!userData && loading ? (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          Cargando…
        </div>
      ) : (
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar userName={userData?.colaborador} />

          {/* ↓ El cambio visual principal: */}
          <div className="max-w-[90%] mx-auto flex-1 p-8 md:pl-64">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Mis Incapacidades</h1>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nueva
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Historial</CardTitle>
                <CardDescription>Documentos de incapacidad</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Comentarios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="animate-spin border-4 border-[#441404] border-t-transparent rounded-full w-10 h-10 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : incapacidades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No has registrado incapacidades.
                        </TableCell>
                      </TableRow>
                    ) : (
                      incapacidades.map(inc => (
                        <TableRow key={inc.id}>
                          <TableCell>{formatDate(inc.fecha_inicio)}</TableCell>
                          <TableCell>{formatDate(inc.fecha_fin)}</TableCell>
                          <TableCell>{formatDate(inc.fecha_subida)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => descargarDocumento(inc.documento_url)}
                            >
                              <Download className="h-4 w-4 mr-1" /> PDF
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="relative inline-block">
                              {unseenCounts[inc.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                                  {unseenCounts[inc.id]}
                                </span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openComments(inc.id)}
                              >
                                <MessageSquare className="h-4 w-4" />
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
      )}

      {/* Modal registro */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Incapacidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fecha inicio</Label>
              <Input
                type="date"
                className="col-span-3"
                value={formData.fechaInicio}
                onChange={e => setFormData(f => ({ ...f, fechaInicio: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fecha fin</Label>
              <Input
                type="date"
                className="col-span-3"
                value={formData.fechaFin}
                onChange={e => setFormData(f => ({ ...f, fechaFin: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Documento (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                className="col-span-3"
                onChange={handleFileChange}
              />
            </div>
            {fileError && <p className="text-sm text-red-500">{fileError}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarIncapacidad} disabled={loading || !!fileError}>
              <Upload className="h-4 w-4 mr-1" /> Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal comentarios */}
      {currentIncapacidadComent && (
        <Dialog
          open={showCommentsModal}
          onOpenChange={open => {
            if (!open) setCurrentIncapacidadComent(null)
            setShowCommentsModal(open)
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Comentarios</DialogTitle>
            </DialogHeader>
            <ComentariosIncapacidades incapacidadId={currentIncapacidadComent} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
