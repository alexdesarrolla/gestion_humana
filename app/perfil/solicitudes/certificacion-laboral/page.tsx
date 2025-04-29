"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { createSupabaseClient } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Download,
  Plus,
  MessageSquare,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ComentariosCertificacion } from "@/components/certificacion-laboral/certificacion-laboral"

export default function CertificacionLaboral() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  // ID del usuario
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id)
    })
  }, [])

  // Estados de certificado
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ dirigidoA: "", incluirSalario: false })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Contador y modal comentarios
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)

  // 1️⃣ Cargar solicitudes propias
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")
      const { data: solData } = await supabase
        .from("solicitudes_certificacion")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("fecha_solicitud", { ascending: false })
      setSolicitudes(solData || [])
      setLoading(false)
    }
    load()
  }, [])

  // 2️⃣ Contar nuevos comentarios de admin
  const fetchUnseen = async (solId: string) => {
    if (!userId) return
    const { count, error } = await supabase
      .from("comentarios_certificacion")
      .select("*", { head: true, count: "exact" })
      .eq("solicitud_id", solId)
      .eq("visto_usuario", false)
      .neq("usuario_id", userId)
    if (!error) setUnseenCounts((p) => ({ ...p, [solId]: count || 0 }))
  }
  useEffect(() => {
    solicitudes.forEach((s) => fetchUnseen(s.id))
  }, [solicitudes, userId])

  // 3️⃣ Realtime: sumar solo de admin
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel("user_comentarios_nuevos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comentarios_certificacion" },
        (p) => {
          const n = p.new as any
          if (n.usuario_id !== userId) {
            setUnseenCounts((p) => ({
              ...p,
              [n.solicitud_id]: (p[n.solicitud_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [userId])

  // 4️⃣ Marcar como leídos
  const markRead = async (solId: string) => {
    if (!userId) return
    await supabase
      .from("comentarios_certificacion")
      .update({ visto_usuario: true })
      .eq("solicitud_id", solId)
      .eq("visto_usuario", false)
      .neq("usuario_id", userId)
    setUnseenCounts((p) => ({ ...p, [solId]: 0 }))
  }

  // 5️⃣ Abrir modal comentarios
  const openComments = (solId: string) => {
    setCurrentId(solId)
    setShowCommentsModal(true)
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })

  // 6️⃣ Enviar nueva solicitud
  const enviarSolicitud = async () => {
    if (!formData.dirigidoA) {
      setError("Complete los campos requeridos")
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")
      const { error: insErr } = await supabase
        .from("solicitudes_certificacion")
        .insert([{
          usuario_id: session.user.id,
          dirigido_a: formData.dirigidoA,
          ciudad: "Cúcuta",
          estado: "pendiente",
          salario_contrato: formData.incluirSalario ? "Si" : "No",
        }])
      if (insErr) throw insErr
      // recarga
      const { data: solData } = await supabase
        .from("solicitudes_certificacion")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("fecha_solicitud", { ascending: false })
      setSolicitudes(solData || [])
      setSuccess("Solicitud enviada. Espera aprobación.")
    } catch (e) {
      console.error(e)
      setError("Error al enviar")
    } finally {
      setLoading(false)
    }
  }

  // 7️⃣ Descargar certificado
  const descargar = async (url: string) => {
    try {
      const r = await fetch(url)
      const b = await r.blob()
      const u = URL.createObjectURL(b)
      const a = document.createElement("a")
      a.href = u
      a.download = "certificado.pdf"
      a.click()
      URL.revokeObjectURL(u)
    } catch {
      setError("Error al descargar")
    }
  }

  return (
    <>
      <Dialog open={showCommentsModal} onOpenChange={(o) => {
        if (o && currentId) markRead(currentId)
        else setCurrentId(null)
        setShowCommentsModal(o)
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Comentarios</DialogTitle>
            <DialogDescription>Solicitud #{currentId}</DialogDescription>
          </DialogHeader>
          {currentId && <ComentariosCertificacion solicitudId={currentId} />}
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-slate-50">
      <Sidebar userName="Usuario" />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-[90%] mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex justify-between items-center pb-8">
                <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Permisos</h1>
                <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Solicitar Permiso
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle /> <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle2 /> <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Dirigido a</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Salario</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudes.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{formatDate(new Date(s.fecha_solicitud))}</TableCell>
                          <TableCell>{s.dirigido_a}</TableCell>
                          <TableCell>{s.ciudad}</TableCell>
                          <TableCell>
                            <Badge variant={s.salario_contrato === "Si" ? "secondary" : "destructive"}>
                              {s.salario_contrato}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              s.estado === "aprobado" ? "secondary" :
                                s.estado === "rechazado" ? "destructive" :
                                  "default"
                            }>
                              {s.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex gap-2 items-center">
                            {s.estado === "aprobado" && s.pdf_url && (
                              <Button size="sm" variant="outline" onClick={() => descargar(s.pdf_url)}>
                                <Download /> Descargar
                              </Button>
                            )}
                            {s.estado === "rechazado" && s.motivo_rechazo && (
                              <Button size="sm" variant="outline" onClick={() => {
                                alert(`Motivo: ${s.motivo_rechazo}`)
                              }}>
                                Ver motivo
                              </Button>
                            )}
                            <div className="relative inline-block">
                              {unseenCounts[s.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                                  {unseenCounts[s.id]}
                                </span>
                              )}
                              <Button size="sm" variant="outline" onClick={() => openComments(s.id)}>
                                <MessageSquare />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Solicitud</DialogTitle>
                    <DialogDescription>Complete los datos</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dirigidoA">Dirigido a</Label>
                      <Input
                        id="dirigidoA"
                        value={formData.dirigidoA}
                        onChange={(e) => setFormData({ ...formData, dirigidoA: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Incluir salario y tipo de contrato?</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={formData.incluirSalario}
                            onChange={() => setFormData({ ...formData, incluirSalario: true })}
                          />
                          Sí
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={!formData.incluirSalario}
                            onChange={() => setFormData({ ...formData, incluirSalario: false })}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    <Button onClick={enviarSolicitud} disabled={loading}>
                      {loading ? "⏳ Generando..." : <><FileText /> Generar</>}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

            </div>
          </div>
        </main>
      </div>
      </div>
    </>
  )
}
