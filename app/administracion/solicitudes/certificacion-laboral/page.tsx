"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardContent } from "@/components/ui/card"
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

  // — ID del admin actual
  const [adminId, setAdminId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAdminId(session.user.id)
    })
  }, [])

  // — estados principales
  const [loading, setLoading] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState("")

  // — para el modal de comentarios
  const [showComments, setShowComments] = useState(false)
  const [currentSolicitud, setCurrentSolicitud] = useState<{
    id: string
    usuario: any
  } | null>(null)

  //
  // 1️⃣ Carga inicial de solicitudes pendientes
  //
  useEffect(() => {
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("solicitudes_certificacion")
          .select(`
            *,
            usuario:usuario_id(
              colaborador,
              cedula,
              cargo
            )
          `)
          .eq("estado", "pendiente")
          .order("fecha_solicitud", { ascending: false })

        if (error) throw error
        setSolicitudes(data || [])
      } catch (e: any) {
        console.error(e)
        setError("No se pudieron cargar las solicitudes")
      } finally {
        setLoading(false)
      }
    }
    fetchSolicitudes()
  }, [])

  //
  // 2️⃣ Contar comentarios no vistos por solicitud
  //
  const fetchUnseen = async (solicitudId: string) => {
    if (!adminId) return
    const { count, error } = await supabase
      .from("comentarios_certificacion")
      .select("*", { head: true, count: "exact" })
      .eq("solicitud_id", solicitudId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)

    if (!error) {
      setUnseenCounts((prev) => ({
        ...prev,
        [solicitudId]: count || 0,
      }))
    }
  }
  useEffect(() => {
    solicitudes.forEach((s) => fetchUnseen(s.id))
  }, [solicitudes, adminId])

  //
  // 3️⃣ Realtime: si llega un INSERT desde otro usuario, incrementar badge
  //
  useEffect(() => {
    if (!adminId) return
    const channel = supabase
      .channel("realtime_nuevos_comentarios")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comentarios_certificacion",
        },
        (payload) => {
          const n = payload.new as any
          if (n.usuario_id !== adminId) {
            setUnseenCounts((prev) => ({
              ...prev,
              [n.solicitud_id]: (prev[n.solicitud_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [adminId])

  //
  // 4️⃣ Marca como leídos (visto_admin = true) y limpia badge local
  //
  const markComentariosRead = async (solId: string) => {
    await supabase
      .from("comentarios_certificacion")
      .update({ visto_admin: true })
      .eq("solicitud_id", solId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)

    setUnseenCounts((prev) => ({
      ...prev,
      [solId]: 0,
    }))
  }

  //
  // 5️⃣ Abre el modal de comentarios: primero marca como leídos, luego abre
  //
  const openComments = async (solId: string, usuario: any) => {
    await markComentariosRead(solId)
    setCurrentSolicitud({ id: solId, usuario })
    setShowComments(true)
  }

  // — formatea fecha
  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  if (loading && solicitudes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-700 text-xl">Cargando…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userName="Administrador" />
      <div className="md:pl-64 flex flex-1">
        <main className="flex-1 py-6 max-w-[90%] mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Solicitudes pendientes</h1>
            <Button
              onClick={() =>
                router.push(
                  "/administracion/solicitudes/certificacion-laboral/historico"
                )
              }
            >
              Ver histórico
            </Button>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tabla */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No hay solicitudes pendientes.
                      </TableCell>
                    </TableRow>
                  )}
                  {solicitudes.map((sol) => (
                    <TableRow key={sol.id}>
                      <TableCell>{sol.usuario.colaborador}</TableCell>
                      <TableCell>{sol.usuario.cedula}</TableCell>
                      <TableCell>{sol.usuario.cargo}</TableCell>
                      <TableCell>
                        {formatDate(new Date(sol.fecha_solicitud))}
                      </TableCell>
                      <TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Modal de comentarios */}
          {currentSolicitud && (
            <Dialog
              open={showComments}
              onOpenChange={(open) => {
                if (!open) {
                  setShowComments(false)
                  setCurrentSolicitud(null)
                }
              }}
            >
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Comentarios de {currentSolicitud.usuario.colaborador}</DialogTitle>
                  <DialogDescription>
                    Solicitud de {currentSolicitud.usuario.colaborador}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <ComentariosCertificacion solicitudId={currentSolicitud.id} />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  )
}
