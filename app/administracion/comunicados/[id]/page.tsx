"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Building2Icon, Users2Icon, ArrowLeftIcon, FileTextIcon } from "lucide-react"
import { ComentariosComunicados } from "@/components/comunicado/comentarios"

interface ComunicadoDetalle {
    id: string
    titulo: string
    contenido: string
    imagen_url: string | null
    fecha_publicacion: string | null
    area_responsable: string
    categoria_id: string | null
    comunicados_empresas?: any[]
    comunicados_usuarios?: any[]
    empresas_destinatarias: { nombre: string }[]
    usuarios_destinatarios: { colaborador: string }[]
}

export default function DetalleComunicadoPage() {
    const params = useParams()
    const router = useRouter()
    const comunicadoId = params.id as string
    const [comunicado, setComunicado] = useState<ComunicadoDetalle | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchComunicado = async () => {
            setLoading(true)
            const supabase = createSupabaseClient()
            const { data, error } = await supabase
                .from("comunicados")
                .select(`
          id,
          titulo,
          contenido,
          imagen_url,
          fecha_publicacion,
          area_responsable,
          categoria_id,
          comunicados_empresas(empresa_id, empresas:empresa_id(nombre)),
          comunicados_usuarios(usuario_id, usuario_nomina:usuario_id(colaborador))
        `)
                .eq("id", comunicadoId)
                .single()
            if (error || !data) {
                setComunicado(null)
            } else {
                const empresas_destinatarias = Array.isArray(data.comunicados_empresas) 
                    ? data.comunicados_empresas
                        .map(item => item.empresas)
                        .filter((empresa): empresa is { nombre: string } => Boolean(empresa && empresa.nombre))
                    : []
                const usuarios_destinatarios = Array.isArray(data.comunicados_usuarios)
                    ? data.comunicados_usuarios
                        .map(item => item.usuario_nomina)
                        .filter((usuario): usuario is { colaborador: string } => Boolean(usuario && usuario.colaborador))
                    : []
                // Creamos un objeto con los datos necesarios para evitar problemas de tipado
                const comunicadoData: ComunicadoDetalle = {
                    id: data.id as string,
                    titulo: data.titulo as string,
                    contenido: data.contenido as string,
                    imagen_url: data.imagen_url as string | null,
                    fecha_publicacion: data.fecha_publicacion as string | null,
                    area_responsable: data.area_responsable as string,
                    categoria_id: data.categoria_id as string | null,
                    empresas_destinatarias,
                    usuarios_destinatarios
                }
                
                setComunicado(comunicadoData)
            }
            setLoading(false)
        }
        if (comunicadoId) fetchComunicado()
    }, [comunicadoId])

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
                        <Button onClick={() => router.back()} className="gap-2">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Volver
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // Formatear la fecha de publicación
    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Fecha no disponible"
        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
        return new Date(dateString).toLocaleDateString("es-ES", options)
    }

    // Obtener las iniciales del área responsable para el avatar
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminSidebar />
            <div className="md:pl-64 flex flex-col flex-1">
                <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-[90%] mx-auto">
                        <Button variant="outline" className="gap-2 mb-4" onClick={() => router.back()}>
                            <ArrowLeftIcon className="h-4 w-4" />
                            Volver a comunicados
                        </Button>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Columna izquierda: SOLO título y contenido */}
                            <div className="lg:col-span-7 bg-white rounded-lg shadow-md p-6">
                                <h1 className="text-3xl font-bold tracking-tight mb-6">{comunicado.titulo}</h1>
                                <div
                                    className="prose prose-slate max-w-none"
                                    dangerouslySetInnerHTML={{ __html: comunicado.contenido }}
                                />
                            </div>

                            {/* Columna derecha: TODO lo demás */}
                            <div className="lg:col-span-5 space-y-6">
                                {/* Imagen */}
                                <Card className="overflow-hidden border-none shadow-md">
                                    {comunicado.imagen_url ? (
                                        <div className="w-full h-[300px] overflow-hidden">
                                            <img
                                                src={comunicado.imagen_url || "/placeholder.svg"}
                                                alt={comunicado.titulo}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-[200px] bg-slate-100 flex items-center justify-center text-slate-400">
                                            <FileTextIcon className="h-16 w-16" />
                                        </div>
                                    )}
                                </Card>

                                {/* Información del comunicado */}
                                <Card className="border-none shadow-md">
                                    <CardContent className="p-6 space-y-6">
                                        {/* Fecha y área responsable */}
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
                                                    <span>Publicado: {formatDate(comunicado.fecha_publicacion)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        {/* Empresas destinatarias */}
                                        {comunicado.empresas_destinatarias && comunicado.empresas_destinatarias.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Building2Icon className="h-4 w-4 text-muted-foreground" />
                                                    <h3>Empresas destinatarias</h3>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {comunicado.empresas_destinatarias.map((empresa, idx) => (
                                                        <Badge key={idx} variant="secondary" className="text-xs">
                                                            {empresa.nombre}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Usuarios destinatarios */}
                                        {comunicado.usuarios_destinatarios && comunicado.usuarios_destinatarios.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Users2Icon className="h-4 w-4 text-muted-foreground" />
                                                    <h3>Usuarios destinatarios</h3>
                                                </div>
                                                <ul className="space-y-1 text-sm">
                                                    {comunicado.usuarios_destinatarios.map((usuario, idx) => (
                                                        <li key={idx} className="flex items-center gap-2">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/70"></span>
                                                            {usuario.colaborador}
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
