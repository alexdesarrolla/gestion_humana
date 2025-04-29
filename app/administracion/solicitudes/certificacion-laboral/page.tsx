"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { AlertCircle, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ComentariosCertificacion } from "@/components/certificacion-laboral/certificacion-laboral"

export default function AdminCertificacionLaboral() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  // 🆔 ID del admin actual
  const [adminId, setAdminId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAdminId(session.user.id)
    })
  }, [])

  // Estados principales
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Diálogo de comentarios
  const [showComments, setShowComments] = useState(false)
  const [currentSolicitud, setCurrentSolicitud] = useState<{ id: string; usuario: any } | null>(null)

  // 1️⃣ Cargar solicitudes pendientes
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("solicitudes_certificacion")
          .select(`
            *,
            usuario:usuario_id(
              colaborador,
              cedula,
              cargo,
              fecha_ingreso,
              empresa_id,
              empresas(nombre, razon_social, nit)
            )
          `)
          .eq("estado", "pendiente")
          .order("fecha_solicitud", { ascending: true })
        if (error) throw error
        setSolicitudes(data || [])
      } catch (e: any) {
        console.error(e)
        setError("No se pudieron cargar las solicitudes")
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  // 2️⃣ Contar comentarios no vistos (solo de usuario, no del admin)
  const fetchUnseen = async (solId: string) => {
    if (!adminId) return
    const { count, error } = await supabase
      .from("comentarios_certificacion")
      .select("*", { head: true, count: "exact" })
      .eq("solicitud_id", solId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)    // <-- filtrar propios
    if (!error) {
      setUnseenCounts((prev) => ({ ...prev, [solId]: count || 0 }))
    }
  }
  useEffect(() => {
    solicitudes.forEach((s) => fetchUnseen(s.id))
  }, [solicitudes, adminId])

  // 3️⃣ Realtime: solo sumar si viene de un usuario diferente
  useEffect(() => {
    if (!adminId) return
    const ch = supabase
      .channel("nuevos_comentarios_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comentarios_certificacion" },
        (p) => {
          const n = p.new as any
          if (n.usuario_id !== adminId) {
            setUnseenCounts((prev) => ({
              ...prev,
              [n.solicitud_id]: (prev[n.solicitud_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [adminId])

  // 4️⃣ Marcar como leídos (visto_admin = true) y limpiar badge
  const markRead = async (solId: string) => {
    await supabase
      .from("comentarios_certificacion")
      .update({ visto_admin: true })
      .eq("solicitud_id", solId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)
    setUnseenCounts((prev) => ({ ...prev, [solId]: 0 }))
  }

  // 5️⃣ Abrir diálogo
  const openComments = (solId: string, usuario: any) => {
    setCurrentSolicitud({ id: solId, usuario })
    setShowComments(true)
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })

  if (loading && solicitudes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Cargando…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName="Administrador" />
      <div className="md:pl-64 flex flex-col max-w-[90%] mx-auto py-6">
        <main className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Solicitudes pendientes</h1>
              <p className="text-muted-foreground">
                Gestiona todas las certificaciones laborales y su historial.
              </p>
            </div>
            <Button onClick={() => router.push('/administracion/solicitudes/certificacion-laboral/historico')}>Ver histórico</Button>
          </div>
          {error && <div className="text-red-600">{error}</div>}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Dirigido</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>SyT</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.usuario.colaborador}</TableCell>
                      <TableCell>{s.usuario.cedula}</TableCell>
                      <TableCell>{s.usuario.cargo}</TableCell>
                      <TableCell>{s.dirigido_a}</TableCell>
                      <TableCell>{s.ciudad}</TableCell>
                      <TableCell>
                        <Badge variant={s.salario_contrato === "Si" ? "secondary" : "destructive"}>
                          {s.salario_contrato}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(new Date(s.fecha_solicitud))}</TableCell>
                      <TableCell>
                        <div className="relative inline-block">
                          {unseenCounts[s.id] > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                              {unseenCounts[s.id]}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openComments(s.id, s.usuario)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {currentSolicitud && (
            <Dialog
              open={showComments}
              onOpenChange={(open) => {
                if (open) markRead(currentSolicitud.id)
                else setCurrentSolicitud(null)
                setShowComments(open)
              }}
            >
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Comentarios de {currentSolicitud.usuario.colaborador}</DialogTitle>
                  <DialogDescription>Solicitud #{currentSolicitud.id}</DialogDescription>
                </DialogHeader>
                <ComentariosCertificacion solicitudId={currentSolicitud.id} />
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  )
}
