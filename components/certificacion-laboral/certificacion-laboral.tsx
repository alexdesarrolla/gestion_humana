"use client"

import React, { useEffect, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Reply, Send, UserIcon, ChevronDown, ChevronUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Comentario {
  id: number
  usuario_id: string
  nombre_usuario: string
  avatarUrl: string
  comentario: string
  fecha: string
  respuesta_a: number | null
  respuestas?: Comentario[]
}

interface UserState {
  id: string
  nombre: string
  avatarUrl: string
}

const supabase = createSupabaseClient()

export function ComentariosCertificacion({ solicitudId }: { solicitudId?: string }) {
  if (!solicitudId) {
    return (
      <div className="p-6 text-center text-red-600">
        ⚠️ Error: no recibí el ID de la solicitud. Asegúrate de pasar <code>solicitudId</code>.
      </div>
    )
  }

  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [respondiendoA, setRespondiendoA] = useState<number | null>(null)
  const [respuestaTexto, setRespuestaTexto] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorFetch, setErrorFetch] = useState<string | null>(null)
  const [user, setUser] = useState<UserState | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({})

  // — cargar usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return
      supabase
        .from("usuario_nomina")
        .select("colaborador, avatar_path, genero")
        .or(`auth_user_id.eq.${authUser.id},user_id.eq.${authUser.id}`)
        .single()
        .then(({ data: perfil }) => {
          const nombre = perfil?.colaborador ?? "Usuario"
          const path = perfil?.avatar_path
          const gender = perfil?.genero
          let avatarUrl: string

          if (path) {
            avatarUrl = supabase.storage.from("avatar").getPublicUrl(path).data.publicUrl
          } else if (gender === "F") {
            avatarUrl = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-f.webp").data.publicUrl
          } else {
            avatarUrl = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp").data.publicUrl
          }

          setUser({ id: authUser.id, nombre, avatarUrl })
        })
    })
  }, [])

  // — función para traer comentarios y armar árbol
  const fetchComentarios = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("comentarios_certificacion")
      .select(`
        id,
        usuario_id,
        comentario,
        fecha,
        respuesta_a,
        usuario_nomina!inner(colaborador, avatar_path, genero)
      `)
      .eq("solicitud_id", solicitudId)
      .order("fecha", { ascending: false })

    if (error) {
      console.error(error)
      setErrorFetch(error.message)
      setComentarios([])
    } else {
      setErrorFetch(null)
      const map: Record<number, Comentario> = {}
      const roots: Comentario[] = []

      data!.forEach((c: any) => {
        const nombre = c.usuario_nomina?.colaborador ?? "Usuario"
        const path = c.usuario_nomina?.avatar_path
        const gender = c.usuario_nomina?.genero
        let avatarUrl: string

        if (path) {
          avatarUrl = supabase.storage.from("avatar").getPublicUrl(path).data.publicUrl
        } else if (gender === "F") {
          avatarUrl = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-f.webp").data.publicUrl
        } else {
          avatarUrl = supabase.storage.from("avatar").getPublicUrl("defecto/avatar-m.webp").data.publicUrl
        }

        map[c.id] = {
          id: c.id,
          usuario_id: c.usuario_id,
          nombre_usuario: nombre,
          avatarUrl,
          comentario: c.comentario,
          fecha: c.fecha,
          respuesta_a: c.respuesta_a,
          respuestas: [],
        }
      })

      Object.values(map).forEach((c) => {
        if (c.respuesta_a && map[c.respuesta_a]) {
          map[c.respuesta_a].respuestas!.push(c)
        } else {
          roots.push(c)
        }
      })

      setComentarios(roots)
    }

    setLoading(false)
  }

  // — cargar al montar y en cambios de ID
  useEffect(() => {
    fetchComentarios()
  }, [solicitudId])

  // — realtime para refrescar al llegar uno nuevo
  useEffect(() => {
    const channel = supabase
      .channel("realtime_comentarios_certificacion")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comentarios_certificacion",
          filter: `solicitud_id=eq.${solicitudId}`,
        },
        () => {
          fetchComentarios()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [solicitudId])

  // — publicar comentario raíz
  const handleComentar = async () => {
    if (!user || !nuevoComentario.trim()) return
    setLoading(true)
    await supabase.from("comentarios_certificacion").insert({
      solicitud_id: solicitudId,
      usuario_id: user.id,
      comentario: nuevoComentario,
      respuesta_a: null,
    })
    setNuevoComentario("")
    setShowConfirmModal(false)
    setLoading(false)
  }

  // — publicar respuesta SOLO a root
  const handleResponder = async (parentId: number) => {
    if (!user || !respuestaTexto.trim()) return
    setLoading(true)
    await supabase.from("comentarios_certificacion").insert({
      solicitud_id: solicitudId,
      usuario_id: user.id,
      comentario: respuestaTexto,
      respuesta_a: parentId,
    })
    setRespuestaTexto("")
    setRespondiendoA(null)
    setLoading(false)
  }

  // — helper “Hace x”
  const formatDate = (iso: string) => {
    const then = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - then.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Hace un momento"
    if (mins < 60) return `Hace ${mins} minuto${mins === 1 ? "" : "s"}`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Hace ${hrs} hora${hrs === 1 ? "" : "s"}`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `Hace ${days} día${days === 1 ? "" : "s"}`
    return then.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" })
  }

  // — render de respuestas **sin** botón “Responder”
  const renderRespuestas = (resps: Comentario[]) => (
    <div className="ml-4 pl-4 border-l-2 border-slate-200 space-y-3 mt-3">
      {resps.map((r) => (
        <Card key={r.id} className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <img src={r.avatarUrl} alt={r.nombre_usuario} className="h-8 w-8 rounded-full object-cover mt-1" />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                  <span className="font-medium text-sm">{r.nombre_usuario}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(r.fecha)}</span>
                </div>
                <p className="text-sm whitespace-pre-line break-words">{r.comentario}</p>
              </div>
            </div>
          </CardContent>
          {/* render de las segundas respuestas, recursivo */}
          {r.respuestas && r.respuestas.length > 0 && renderRespuestas(r.respuestas)}
        </Card>
      ))}
    </div>
  )

  return (
    <Card className="shadow-md border-none">
      <CardHeader className="pb-3 bg-slate-50">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Comentarios de certificación
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {user ? (
          <>
            {/* área para crear nuevo comentario */}
            <div className="flex gap-3 mb-6">
              <img src={user.avatarUrl} alt={user.nombre} className="h-8 w-8 rounded-full object-cover mt-1" />
              <Textarea
                rows={3}
                className="flex-1 resize-none"
                placeholder="Escribe un comentario sobre esta solicitud..."
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
              />
            </div>
            <div className="flex justify-end mb-6">
              <Button onClick={() => setShowConfirmModal(true)} disabled={!nuevoComentario.trim()}>
                <Send className="h-4 w-4 mr-1" />
                Publicar comentario
              </Button>
            </div>
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar publicación</DialogTitle>
                  <DialogDescription>
                    ¿Seguro que quieres publicar este comentario? <br />
                    <strong>No podrás eliminarlo luego.</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleComentar} disabled={loading}>
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Separator className="my-6" />
          </>
        ) : (
          <div className="bg-slate-50 p-4 rounded-md text-center mb-6">
            <UserIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-muted-foreground">Inicia sesión para comentar.</p>
          </div>
        )}

        {errorFetch && (
          <div className="text-center text-red-600 mb-4">
            ❌ Error al cargar comentarios: {errorFetch}
          </div>
        )}

        {loading && comentarios.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : comentarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
            <p>No hay comentarios aún.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm">
                {comentarios.length} {comentarios.length === 1 ? "comentario" : "comentarios"}
              </h3>
              <Badge variant="outline" className="text-xs">
                Más recientes primero
              </Badge>
            </div>
            <div className="space-y-4">
              {comentarios.map((c) => (
                <Card key={c.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <img src={c.avatarUrl} alt={c.nombre_usuario} className="h-8 w-8 rounded-full object-cover mt-1" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                          <span className="font-medium text-sm">{c.nombre_usuario}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(c.fecha)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-line break-words">{c.comentario}</p>
                        <div className="mt-2 flex gap-2">
                          {/* Solo en PRINCIPALES permitimos responder */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setRespondiendoA(c.id)
                              setRespuestaTexto("")
                            }}
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Responder
                          </Button>
                          {c.respuestas && c.respuestas.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs flex items-center gap-1 text-primary hover:text-primary/80"
                              onClick={() =>
                                setExpandedComments((e) => ({ ...e, [c.id]: !e[c.id] }))
                              }
                            >
                              <MessageSquare className="h-3 w-3" />
                              {c.respuestas.length}{" "}
                              {c.respuestas.length === 1 ? "respuesta" : "respuestas"}
                              {expandedComments[c.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                        {/* textarea de respuesta a un root */}
                        {respondiendoA === c.id && (
                          <div className="mt-3 bg-slate-50 p-3 rounded-md">
                            <Badge variant="outline" className="text-xs mb-2">
                              Respondiendo a {c.nombre_usuario}
                            </Badge>
                            <Textarea
                              rows={2}
                              className="resize-none text-sm"
                              value={respuestaTexto}
                              onChange={(e) => setRespuestaTexto(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <Button size="sm" variant="outline" onClick={() => setRespondiendoA(null)}>
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={() => handleResponder(c.id)} disabled={loading}>
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Enviar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  {/* respuestas anidadas, sin botón de reply */}
                  {expandedComments[c.id] && c.respuestas && c.respuestas.length > 0 && renderRespuestas(c.respuestas)}
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {comentarios.length > 10 && (
        <CardFooter className="bg-slate-50 py-3 px-6 border-t flex justify-center">
          <Button size="sm" variant="outline" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Cargar más comentarios
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
