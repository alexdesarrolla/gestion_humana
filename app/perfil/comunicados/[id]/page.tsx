"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { Sidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Building2Icon, Users2Icon, ArrowLeftIcon, FileTextIcon, CheckIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import { ComentariosComunicados } from "@/components/comunicado/comentarios"

interface ComunicadoDetalle {
  id: string
  titulo: string
  contenido: string
  imagen_url: string | null
  fecha_publicacion: string | null
  area_responsable: string
  categoria_id?: string
  empresas_destinatarias?: { nombre: string }[]
  usuarios_destinatarios?: { colaborador: string }[]
}

export default function DetalleComunicadoPage() {
  const { id: comunicadoId } = useParams() as { id: string }
  const router = useRouter()

  const [comunicado, setComunicado] = useState<ComunicadoDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [leido, setLeido] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // 1) Cargar el comunicado
  useEffect(() => {
    const fetchComunicado = async () => {
      setLoading(true)
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from("comunicados")
        .select(
          `
            id,
            titulo,
            contenido,
            imagen_url,
            fecha_publicacion,
            area_responsable,
            categoria_id,
            comunicados_empresas (
              empresa_id,
              empresas:empresa_id (
                nombre
              )
            ),
            comunicados_usuarios (
              usuario_id,
              usuario_nomina:usuario_id (
                colaborador
              )
            )
          `,
        )
        .eq("id", comunicadoId)
        .single()

      if (!error && data) {
        const empresas_destinatarias = data.comunicados_empresas?.map((i: any) => i.empresas).filter(Boolean)
        const usuarios_destinatarios = data.comunicados_usuarios?.map((i: any) => i.usuario_nomina).filter(Boolean)

        setComunicado({
          ...data,
          empresas_destinatarias,
          usuarios_destinatarios,
        })
      } else {
        setComunicado(null)
      }
      setLoading(false)
    }

    fetchComunicado()
  }, [comunicadoId])

  // 2) Comprobar si ya existe registro de lectura
  useEffect(() => {
    if (!comunicado) return
    const checkLeido = async () => {
      const supabase = createSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: readEntry, error } = await supabase
        .from("comunicados_leidos")
        .select("usuario_id")
        .eq("comunicado_id", comunicadoId)
        .eq("usuario_id", user.id)
        .single()

      if (!error && readEntry) {
        setLeido(true)
      }
    }
    checkLeido()
  }, [comunicado, comunicadoId])

  // 3) Handler de confirmación de lectura
  const handleConfirmRead = async () => {
    try {
      const supabase = createSupabaseClient()
      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser()
      if (sessionError || !user) throw new Error("No session")

      const { error } = await supabase.from("comunicados_leidos").upsert({
        comunicado_id: comunicadoId,
        usuario_id: user.id,
      })

      if (error) throw error

      setLeido(true)
      setConfirmDialogOpen(false)
    } catch (err) {
      console.error("Error al marcar como leído:", err)
    }
  }

  // Helpers
  const formatDate = (s: string | null) =>
    s
      ? new Date(s).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Fecha no disponible"

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Cargando comunicado...</p>
        </div>
      </div>
    )
  }

  if (!comunicado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Card className="max-w-md w-full">
          <div className="text-center p-6">
            <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <h2 className="text-2xl font-bold">Comunicado no encontrado</h2>
          </div>
          <CardFooter className="flex justify-center pb-6">
            <Button onClick={() => router.back()} className="flex items-center gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Volver
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[90%] mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" className="gap-2" onClick={() => router.back()}>
                <ArrowLeftIcon className="h-4 w-4" />
                Volver a comunicados
              </Button>

              {leido ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckIcon className="h-4 w-4" /> Leído
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={() => setConfirmDialogOpen(true)}
                >
                  <CheckIcon className="h-4 w-4" /> Marcar como leído
                </Button>
              )}
            </div>

            {/* Modal de confirmación */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar lectura</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que has leído toda la información del comunicado?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConfirmRead}>Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Contenido */}
              <div className="lg:col-span-7 bg-white rounded-lg shadow-md p-6">
                <h1 className="text-3xl font-bold mb-6">{comunicado.titulo}</h1>
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: comunicado.contenido }}
                />
              </div>

              {/* Panel lateral */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="overflow-hidden border-none shadow-md">
                  {comunicado.imagen_url ? (
                    <img
                      src={comunicado.imagen_url || "/placeholder.svg"}
                      alt={comunicado.titulo}
                      className="w-full h-[300px] object-cover"
                    />
                  ) : (
                    <div className="h-[200px] bg-slate-100 flex items-center justify-center text-slate-400">
                      <FileTextIcon className="h-16 w-16" />
                    </div>
                  )}
                </Card>

                <Card className="border-none shadow-md">
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                          {getInitials(comunicado.area_responsable)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{comunicado.area_responsable}</p>
                          <p className="text-xs text-muted-foreground">Área responsable</p>
                        </div>
                      </div>
                      {comunicado.fecha_publicacion && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Publicado: {formatDate(comunicado.fecha_publicacion)}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {comunicado.empresas_destinatarias?.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Building2Icon className="h-4 w-4 text-muted-foreground" />
                          Empresas destinatarias
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {comunicado.empresas_destinatarias.map((e, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {e.nombre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {comunicado.usuarios_destinatarios?.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Users2Icon className="h-4 w-4 text-muted-foreground" />
                          Usuarios destinatarios
                        </div>
                        <ul className="space-y-1 text-sm">
                          {comunicado.usuarios_destinatarios.map((u, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                              {u.colaborador}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Sección de Comentarios */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="mt-4 mb-10 lg:col-span-7">
                <ComentariosComunicados comunicadoId={comunicado.id} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
