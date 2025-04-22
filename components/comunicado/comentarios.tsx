"use client"

import { useEffect, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Reply, Send, User } from "lucide-react"

interface Comentario {
  id: number
  usuario_id: string
  nombre_usuario: string
  comentario: string
  fecha: string
  respuesta_a: number | null
  respuestas?: Comentario[]
}

export function ComentariosComunicados({ comunicadoId }: { comunicadoId: string }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [respondiendoA, setRespondiendoA] = useState<number | null>(null)
  const [respuestaTexto, setRespuestaTexto] = useState("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; nombre: string } | null>(null)

  // Obtener usuario actual
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      // Buscar nombre en usuario_nomina
      const { data: perfil } = await supabase
        .from("usuario_nomina")
        .select("colaborador")
        .eq("auth_user_id", user.id)
        .single()
      setUser({ id: user.id, nombre: perfil?.colaborador || "Usuario" })
    }
    fetchUser()
  }, [])

  // Cargar comentarios
  useEffect(() => {
    const fetchComentarios = async () => {
      setLoading(true)
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from("comentarios_comunicados")
        .select(`id, usuario_id, comentario, fecha, respuesta_a, usuario_nomina:usuario_id(colaborador)`)
        .eq("comunicado_id", comunicadoId)
        .order("fecha", { ascending: true })
      if (!error && data) {
        // Normalizar y anidar respuestas
        const map: { [id: number]: Comentario } = {}
        const roots: Comentario[] = []
        data.forEach((c: any) => {
          map[c.id] = {
            id: c.id,
            usuario_id: c.usuario_id,
            nombre_usuario: c.usuario_nomina?.colaborador || "Usuario",
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
    fetchComentarios()
  }, [comunicadoId])

  // Añadir comentario
  const handleComentar = async () => {
    if (!nuevoComentario.trim() || !user) return
    setLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from("comentarios_comunicados").insert({
      comunicado_id: comunicadoId,
      usuario_id: user.id,
      comentario: nuevoComentario,
      respuesta_a: null,
    })
    setNuevoComentario("")
    // Recargar comentarios
    const { data } = await supabase
      .from("comentarios_comunicados")
      .select(`id, usuario_id, comentario, fecha, respuesta_a, usuario_nomina:usuario_id(colaborador)`)
      .eq("comunicado_id", comunicadoId)
      .order("fecha", { ascending: true })
    if (data) {
      const map: { [id: number]: Comentario } = {}
      const roots: Comentario[] = []
      data.forEach((c: any) => {
        map[c.id] = {
          id: c.id,
          usuario_id: c.usuario_id,
          nombre_usuario: c.usuario_nomina?.colaborador || "Usuario",
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

  // Responder a comentario
  const handleResponder = async (comentarioId: number) => {
    if (!respuestaTexto.trim() || !user) return
    setLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from("comentarios_comunicados").insert({
      comunicado_id: comunicadoId,
      usuario_id: user.id,
      comentario: respuestaTexto,
      respuesta_a: comentarioId,
    })
    setRespuestaTexto("")
    setRespondiendoA(null)
    // Recargar comentarios
    const { data } = await supabase
      .from("comentarios_comunicados")
      .select(`id, usuario_id, comentario, fecha, respuesta_a, usuario_nomina:usuario_id(colaborador)`)
      .eq("comunicado_id", comunicadoId)
      .order("fecha", { ascending: true })
    if (data) {
      const map: { [id: number]: Comentario } = {}
      const roots: Comentario[] = []
      data.forEach((c: any) => {
        map[c.id] = {
          id: c.id,
          usuario_id: c.usuario_id,
          nombre_usuario: c.usuario_nomina?.colaborador || "Usuario",
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

  // Obtener iniciales para avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Hace un momento"
    if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
    if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`

    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const renderComentarios = (comentarios: Comentario[], nivel = 0) => (
    <div className={nivel === 0 ? "space-y-4" : "space-y-3 mt-3"}>
      {comentarios.map((c) => (
        <div key={c.id} className={nivel > 0 ? "pl-4 ml-4 border-l-2 border-slate-200" : ""}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar personalizado sin usar el componente Avatar */}
                <div className="h-8 w-8 mt-1 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                  {getInitials(c.nombre_usuario)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                    <span className="font-medium text-sm">{c.nombre_usuario}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.fecha)}</span>
                  </div>
                  <div className="text-sm whitespace-pre-line break-words">{c.comentario}</div>
                  <div className="mt-2">
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
                  </div>

                  {respondiendoA === c.id && (
                    <div className="mt-3 bg-slate-50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          Respondiendo a {c.nombre_usuario}
                        </Badge>
                      </div>
                      <Textarea
                        value={respuestaTexto}
                        onChange={(e) => setRespuestaTexto(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setRespondiendoA(null)}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleResponder(c.id)}
                          disabled={loading || !respuestaTexto.trim()}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {c.respuestas && c.respuestas.length > 0 && renderComentarios(c.respuestas, nivel + 1)}
        </div>
      ))}
    </div>
  )

  return (
    <Card className="shadow-md border-none">
      <CardHeader className="pb-3 bg-slate-50">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Comentarios y discusión
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {user ? (
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-3">
              {/* Avatar personalizado sin usar el componente Avatar */}
              <div className="h-8 w-8 mt-1 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                {getInitials(user.nombre)}
              </div>
              <div className="flex-1">
                <Textarea
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe un comentario o pregunta sobre este comunicado..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleComentar} disabled={loading || !nuevoComentario.trim()} className="gap-1.5">
                <Send className="h-4 w-4" />
                Publicar comentario
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-4 rounded-md text-center mb-6">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-muted-foreground">Inicia sesión para comentar en este comunicado.</p>
          </div>
        )}

        <Separator className="my-6" />

        {loading && comentarios.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : comentarios.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">No hay comentarios aún. Sé el primero en comentar.</p>
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
            {renderComentarios(comentarios)}
          </>
        )}
      </CardContent>

      {comentarios.length > 5 && (
        <CardFooter className="bg-slate-50 py-3 px-6 border-t flex justify-center">
          <Button variant="outline" size="sm" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Cargar más comentarios
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
