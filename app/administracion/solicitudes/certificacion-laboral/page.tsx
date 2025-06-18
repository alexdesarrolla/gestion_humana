"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Plus,
} from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ComentariosCertificacion } from "@/components/certificacion-laboral/certificacion-laboral"

export default function AdminCertificacionLaboral() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  // — Auth: obtener ID del admin
  const [adminId, setAdminId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAdminId(session.user.id)
    })
  }, [supabase.auth])

  // — Estados generales
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // — Contadores de comentarios no vistos
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})

  // — Modal de comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentSolicitudComent, setCurrentSolicitudComent] = useState<{
    id: string
    usuario: any
  } | null>(null)

  // — Estados creación/aprobación
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    cedula: "",
    dirigidoA: "",
    ciudad: "",
    incluirSalario: false,
  })
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<any>(null)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<{
    id: string
    usuario: any
  } | null>(null)
  const [showTipoModal, setShowTipoModal] = useState(false)
  const [showSalarioModal, setShowSalarioModal] = useState(false)
  const [salarioData, setSalarioData] = useState({
    salario: "",
    tipoContrato: "Contrato a término indefinido",
  })

  // — Formatea fecha en español
  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  //
  // 1️⃣ Cargar solicitudes pendientes
  //
  const fetchSolicitudes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("solicitudes_certificacion")
        .select(`
          *,
          usuario_nomina:usuario_id(
            colaborador,
            cedula,
            fecha_ingreso,
            empresa_id,
            empresas:empresa_id(nombre, razon_social, nit),
            cargos:cargo_id(nombre)
          )
        `)
        .eq("estado", "pendiente")
        .order("fecha_solicitud", { ascending: true })

      if (error) throw error
      setSolicitudes(data || [])
    } catch (err: any) {
      console.error("Error en fetchSolicitudes:", err)
      setError(err?.message || "Error al cargar las solicitudes")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSolicitudes()
  }, [fetchSolicitudes])

  //
  // 2️⃣ Contar comentarios no vistos por solicitud
  //
  const fetchUnseenCount = async (solId: string) => {
    if (!adminId) return
    const { count, error } = await supabase
      .from("comentarios_certificacion")
      .select("*", { head: true, count: "exact" })
      .eq("solicitud_id", solId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)

    if (!error) {
      setUnseenCounts((prev) => ({ ...prev, [solId]: count || 0 }))
    }
  }

  useEffect(() => {
    solicitudes.forEach((s) => fetchUnseenCount(s.id))
  }, [solicitudes, adminId])

  //
  // 3️⃣ Realtime: suscripción a nuevos comentarios
  //
  useEffect(() => {
    if (!adminId) return

    const comentarioChannel = supabase
      .channel("comentarios_admin_channel", {
        config: { broadcast: { ack: false } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comentarios_certificacion",
        },
        (payload) => {
          const nuevo = payload.new as any
          if (nuevo.usuario_id !== adminId) {
            setUnseenCounts((prev) => ({
              ...prev,
              [nuevo.solicitud_id]: (prev[nuevo.solicitud_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(comentarioChannel)
    }
  }, [adminId, supabase])

  //
  // 4️⃣ Abrir modal de comentarios
  //
  const openComments = async (solId: string, usuario: any) => {
    await supabase
      .from("comentarios_certificacion")
      .update({ visto_admin: true })
      .eq("solicitud_id", solId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)

    setUnseenCounts((prev) => ({ ...prev, [solId]: 0 }))
    setCurrentSolicitudComent({ id: solId, usuario })
    setShowCommentsModal(true)
  }

  //
  // 5️⃣ Aprobar solicitud (PDF + Storage + DB)
  //
  const aprobarSolicitud = async (solicitudId: string, usuarioData: any) => {
    try {
      setLoading(true)
      setError("")

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const salario = localStorage.getItem("certificacion_salario")
      const tipoContrato = localStorage.getItem("certificacion_tipoContrato")
      const incluirDatosSalariales = Boolean(salario && tipoContrato)

      const { data: solData, error: solErr } = await supabase
        .from("solicitudes_certificacion")
        .select("*")
        .eq("id", solicitudId)
        .single()
      if (solErr) throw solErr

      const precargarImagen = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error(`Error al cargar imagen: ${src}`))
          img.src = src
        })

      const fechaActual = formatDate(new Date())
      const empresa = usuarioData.empresas?.razon_social || "BDATAM"
      const pathLogo = `${window.location.origin}/img/membrete/membrete-${usuarioData.empresa_id || 1}.jpg`
      const pathFirma = "/img/firma/firma-lissette.png"

      try {
        await Promise.all([precargarImagen(pathLogo), precargarImagen(pathFirma)])
      } catch {
        // ignorar
      }

      const container = document.createElement("div")
      container.style.width = "215.9mm"
      container.style.height = "279.4mm"
      container.style.position = "absolute"
      container.style.left = "-9999px"
      container.style.backgroundColor = "white"
      container.style.fontFamily = "Arial, sans-serif"

      let html = `
        <div style="background-image:url('${pathLogo}'); background-size:cover; background-blend-mode:lighten; background-color:rgba(255,255,255,0.85); width:215.9mm; height:279.4mm;">
          <div style="padding:180px 100px 0;"><h1 style="text-align:center; text-transform:uppercase; font-size:16px;">
            LA DIRECTORA DE TALENTO HUMANO DE ${empresa}
          </h1></div>
          <div style="text-align:center; margin:50px 0; padding:0 100px;">
            <h2 style="font-size:16px; font-weight:bold;">CERTIFICA:</h2>
          </div>
          <div style="text-align:justify; line-height:1.6; margin:30px 0; padding:0 100px;">
            <p>Que el(la) Señor(a)
              <strong>${usuarioData.colaborador}</strong>
              identificado(a) con cédula No.
              <strong>${usuarioData.cedula}</strong>,
              está vinculado(a) desde el
              <strong>${usuarioData.fecha_ingreso}</strong>,
              donde se desempeña como
              <strong>${usuarioData.cargos?.nombre || 'N/A'}</strong>`

      if (incluirDatosSalariales) {
        const salFmt = new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(salario))
        html += `, con salario mensual de <strong>${salFmt}</strong> mediante <strong>${tipoContrato}</strong>`
      }

      html += `.</p></div>
        <div style="padding:0 100px; margin:50px 0;">
          <p>Se expide para ${solData.dirigido_a}, en ${solData.ciudad}, ${fechaActual}.</p>
        </div>
        <div style="padding:0 100px; margin-top:80px;">
          <p>Atentamente,</p>
          <div style="position:relative; height:100px;">
            <img src="${pathFirma}" style="width:200px; position:absolute; top:0; left:0;" />
          </div>
          <p><strong>LISSETTE VANESSA CALDERON</strong><br>
          Directora de Talento Humano<br>
          ${empresa}<br>
          Nit ${usuarioData.empresas?.nit}</p>
        </div>
      </div>`

      container.innerHTML = html
      document.body.appendChild(container)
      await new Promise((r) => setTimeout(r, 500))

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 816,
        height: 1056,
        windowWidth: 816,
        windowHeight: 1056,
        onclone: (clonedDoc) => {
          Array.from(clonedDoc.getElementsByTagName("img")).forEach((img) => {
            img.crossOrigin = "anonymous"
          })
        },
      })
      document.body.removeChild(container)

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter", compress: true })
      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      pdf.addImage(imgData, "JPEG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight())

      const blob = pdf.output("blob")
      const fileName = `certificados/${solicitudId}.pdf`
      const { error: upErr } = await supabase.storage
        .from("certificados")
        .upload(fileName, blob, { upsert: true, cacheControl: "3600" })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from("certificados").getPublicUrl(fileName)
      const { error: updErr } = await supabase
        .from("solicitudes_certificacion")
        .update({
          estado: "aprobado",
          admin_id: session.user.id,
          fecha_resolucion: new Date(),
          pdf_url: urlData.publicUrl,
        })
        .eq("id", solicitudId)
      if (updErr) throw updErr

      localStorage.removeItem("certificacion_salario")
      localStorage.removeItem("certificacion_tipoContrato")
      setSuccess("Certificado generado y solicitud aprobada.")
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitudId))
    } catch (err: any) {
      console.error("Error al generar certificado:", err)
      setError(err?.message || "Error al generar el PDF")
    } finally {
      setLoading(false)
    }
  }

  //
  // 6️⃣ Rechazar solicitud
  //
  const rechazarSolicitud = async (solId: string, motivo: string) => {
    try {
      setLoading(true)
      setError("")
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return router.push("/login")

      const { error: e } = await supabase
        .from("solicitudes_certificacion")
        .update({
          estado: "rechazado",
          admin_id: session.user.id,
          fecha_resolucion: new Date(),
          motivo_rechazo: motivo,
        })
        .eq("id", solId)
      if (e) throw e

      setSuccess("Solicitud rechazada.")
      setSolicitudes((prev) => prev.filter((s) => s.id !== solId))
    } catch {
      setError("Error al rechazar solicitud")
    } finally {
      setLoading(false)
    }
  }

  //
  // 7️⃣ Crear nueva solicitud
  //
  const buscarUsuario = async () => {
    if (!formData.cedula) {
      setError("Ingresa cédula")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("usuario_nomina")
        .select("*, empresas:empresa_id(nombre, razon_social, nit), cargos:cargo_id(nombre)")
        .eq("cedula", formData.cedula)
        .single()
      if (error) throw error
      setUsuarioEncontrado(data)
    } catch {
      setError("Usuario no encontrado")
    } finally {
      setLoading(false)
    }
  }

  const crearCertificado = async () => {
    if (!usuarioEncontrado || !formData.dirigidoA || !formData.ciudad) {
      setError("Completa todos los campos")
      return
    }
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return router.push("/login")

      const { data: newSol, error: solErr } = await supabase
        .from("solicitudes_certificacion")
        .insert([
          {
            usuario_id: session.user.id,
            dirigido_a: formData.dirigidoA,
            ciudad: formData.ciudad,
            estado: "pendiente",
            salario_contrato: formData.incluirSalario ? "Si" : "No",
          },
        ])
        .select()
        .single()
      if (solErr) throw solErr

      if (formData.incluirSalario) {
        localStorage.setItem("certificacion_salario", salarioData.salario)
        localStorage.setItem("certificacion_tipoContrato", salarioData.tipoContrato)
      }

      await aprobarSolicitud(newSol.id as string, usuarioEncontrado)

      setShowCreateModal(false)
      setFormData({ cedula: "", dirigidoA: "", ciudad: "", incluirSalario: false })
      setUsuarioEncontrado(null)
    } catch {
      setError("Error al crear la solicitud")
    } finally {
      setLoading(false)
    }
  }

  //
  // Renderizar UI
  //
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName="Administrador" />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="py-6">
          <div className="max-w-[90%] mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Solicitudes de Certificación Laboral</h1>
                <p className="text-muted-foreground">Gestiona las solicitudes pendientes.</p>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-1" />Nueva solicitud
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
                      <TableHead>SyT</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitudes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">
                          No hay solicitudes pendientes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      solicitudes.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell>{sol.usuario_nomina.colaborador}</TableCell>
                <TableCell>{sol.usuario_nomina.cedula}</TableCell>
                <TableCell>{sol.usuario_nomina.cargos?.nombre || 'N/A'}</TableCell>
                          <TableCell>{sol.dirigido_a}</TableCell>
                          <TableCell>{sol.ciudad}</TableCell>
                          <TableCell>
                            <Badge
                              variant={sol.salario_contrato === "Si" ? "secondary" : "destructive"}
                            >
                              {sol.salario_contrato || "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(new Date(sol.fecha_solicitud))}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const motivo = prompt("Motivo del rechazo:")
                                if (motivo) rechazarSolicitud(sol.id, motivo)
                              }}
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSolicitudSeleccionada({ id: sol.id, usuario: sol.usuario })
                                if (sol.salario_contrato === "Si") {
                                  setShowSalarioModal(true)
                                } else {
                                  aprobarSolicitud(sol.id, sol.usuario)
                                }
                              }}
                            >
                              Aprobar
                            </Button>
                            <div className="relative inline-block">
                              {unseenCounts[sol.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                                  {unseenCounts[sol.id]}
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openComments(sol.id, sol.usuario)}
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
        </main>
      </div>

      {/* — Modal crear solicitud */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Solicitud</DialogTitle>
            <DialogDescription>Ingresa datos para nueva solicitud</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <Label htmlFor="cedula">Cédula</Label>
              <Input
                id="cedula"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              />
              <Button onClick={buscarUsuario} disabled={loading}>
                Buscar
              </Button>
            </div>
            {usuarioEncontrado && (
              <div className="p-4 bg-slate-50 rounded">
                <p><strong>Nombre:</strong> {usuarioEncontrado.colaborador}</p>
                <p><strong>Cargo:</strong> {usuarioEncontrado.cargos?.nombre || 'N/A'}</p>
                <p><strong>Empresa:</strong> {usuarioEncontrado.empresas?.razon_social}</p>
              </div>
            )}
            <div>
              <Label htmlFor="dirigidoA">Dirigido a</Label>
              <Input
                id="dirigidoA"
                value={formData.dirigidoA}
                onChange={(e) => setFormData({ ...formData, dirigidoA: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.incluirSalario}
                onChange={(e) => setFormData({ ...formData, incluirSalario: e.target.checked })}
              />
              <Label>Incluir salario</Label>
            </div>
            {formData.incluirSalario && (
              <div className="p-4 border rounded">
                <div>
                  <Label htmlFor="salario">Salario</Label>
                  <Input
                    id="salario"
                    type="number"
                    value={salarioData.salario}
                    onChange={(e) => setSalarioData({ ...salarioData, salario: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo contrato</Label>
                  <Select
                    value={salarioData.tipoContrato}
                    onValueChange={(v) => setSalarioData({ ...salarioData, tipoContrato: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contrato a término indefinido">
                        Contrato a término indefinido
                      </SelectItem>
                      <SelectItem value="Contrato de aprendizaje">
                        Contrato de aprendizaje
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={crearCertificado} disabled={loading || !usuarioEncontrado}>
                Crear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* — Modal seleccionar tipo */}
      <Dialog open={showTipoModal} onOpenChange={setShowTipoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tipo de Certificación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              className="w-full"
              onClick={() => {
                if (!solicitudSeleccionada) return
                setShowTipoModal(false)
                aprobarSolicitud(solicitudSeleccionada.id, solicitudSeleccionada.usuario)
              }}
            >
              Sin salario
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setShowTipoModal(false)
                setShowSalarioModal(true)
              }}
            >
              Con salario
            </Button>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowTipoModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* — Modal ingresar salario */}
      <Dialog open={showSalarioModal} onOpenChange={setShowSalarioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datos Salariales</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="salInput">Salario</Label>
              <Input
                id="salInput"
                type="number"
                value={salarioData.salario}
                onChange={(e) => setSalarioData({ ...salarioData, salario: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo contrato</Label>
              <Select
                value={salarioData.tipoContrato}
                onValueChange={(v) => setSalarioData({ ...salarioData, tipoContrato: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contrato a término indefinido">
                    Contrato a término indefinido
                  </SelectItem>
                  <SelectItem value="Contrato de aprendizaje">
                    Contrato de aprendizaje
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSalarioModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!solicitudSeleccionada) return
                  localStorage.setItem("certificacion_salario", salarioData.salario)
                  localStorage.setItem("certificacion_tipoContrato", salarioData.tipoContrato)
                  setShowSalarioModal(false)
                  aprobarSolicitud(solicitudSeleccionada.id, solicitudSeleccionada.usuario)
                }}
                disabled={!salarioData.salario}
              >
                Generar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* — Modal comentarios */}
      {currentSolicitudComent && (
        <Dialog
          open={showCommentsModal}
          onOpenChange={(open) => {
            if (!open) setCurrentSolicitudComent(null)
            setShowCommentsModal(open)
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Comentarios de {currentSolicitudComent.usuario_nomina.colaborador}
              </DialogTitle>
            </DialogHeader>
            <ComentariosCertificacion solicitudId={currentSolicitudComent.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
