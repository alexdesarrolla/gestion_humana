"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BookOpenCheckIcon,
  MessageSquareIcon,
  SearchIcon,
  ArrowLeftIcon,
  CalendarIcon,
  BarChart3Icon,
  UsersIcon,
  EyeIcon,
  ClockIcon,
  FilterIcon,
} from "lucide-react"

interface ComunicadoLeido {
  usuario_nomina: { colaborador: string }
  leido_at: string
}

export default function DetallesComunicadoPage() {
  const router = useRouter()
  const { id: comunicadoId } = useParams() as { id: string }
  const [usuariosLeidos, setUsuariosLeidos] = useState<ComunicadoLeido[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [comunicadoInfo, setComunicadoInfo] = useState<{
    titulo: string
    total_destinatarios: number
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      if (!comunicadoId) {
        setLoading(false)
        return
      }

      const supabase = createSupabaseClient()

      // Obtener información del comunicado
      const { data: comunicadoData, error: comunicadoError } = await supabase
        .from("comunicados")
        .select("titulo")
        .eq("id", comunicadoId)
        .single()

      if (comunicadoError) {
        console.error("Error fetching comunicado:", comunicadoError)
      } else if (comunicadoData) {
        // Obtener total de destinatarios (usuarios + empresas)
        const { count: usuariosCount } = await supabase
          .from("comunicados_usuarios")
          .select("*", { count: "exact", head: true })
          .eq("comunicado_id", comunicadoId)

        setComunicadoInfo({
          titulo: comunicadoData.titulo,
          total_destinatarios: usuariosCount || 0,
        })
      }

      // Obtener lecturas
      const { data, error } = await supabase
        .from("comunicados_leidos")
        .select("usuario_nomina:usuario_id(colaborador), leido_at")
        .eq("comunicado_id", comunicadoId)
        .order("leido_at", { ascending: false })

      if (error) {
        console.error("Error fetching lecturas:", error)
      } else {
        setUsuariosLeidos(data)
      }

      setLoading(false)
    }

    fetchData()
  }, [comunicadoId])

  const formatDate = (s: string) => {
    const date = new Date(s)

    // Obtener la fecha actual
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Obtener ayer
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Comprobar si es hoy o ayer
    if (date.toDateString() === today.toDateString()) {
      return `Hoy a las ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer a las ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
    } else {
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const filteredUsuarios = usuariosLeidos.filter((u) =>
    u.usuario_nomina.colaborador.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calcular porcentaje de lecturas
  const porcentajeLecturas = comunicadoInfo?.total_destinatarios
    ? Math.round((usuariosLeidos.length / comunicadoInfo.total_destinatarios) * 100)
    : 0

  // Agrupar lecturas por fecha
  const lecturasPorFecha: Record<string, number> = {}
  usuariosLeidos.forEach((u) => {
    const fecha = new Date(u.leido_at).toLocaleDateString()
    lecturasPorFecha[fecha] = (lecturasPorFecha[fecha] || 0) + 1
  })

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 p-6 md:pl-64">
        <div className="max-w-[90%] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <Button variant="ghost" className="mb-2 -ml-2 gap-2 hover:bg-slate-100" onClick={() => router.back()}>
                <ArrowLeftIcon className="h-4 w-4" />
                Volver a comunicados
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">
                {loading ? "Cargando detalles..." : comunicadoInfo?.titulo || "Detalles del comunicado"}
              </h1>
              <p className="text-muted-foreground mt-1">Estadísticas y seguimiento de lecturas</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                <EyeIcon className="h-3.5 w-3.5 mr-1" />
                {usuariosLeidos.length} lecturas
              </Badge>

              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 px-3 py-1">
                <UsersIcon className="h-3.5 w-3.5 mr-1" />
                {comunicadoInfo?.total_destinatarios || 0} destinatarios
              </Badge>
            </div>
          </div>

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lecturas</p>
                    <h3 className="text-2xl font-bold">{usuariosLeidos.length}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <BookOpenCheckIcon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Porcentaje</p>
                    <h3 className="text-2xl font-bold">{porcentajeLecturas}%</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <BarChart3Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Última lectura</p>
                    <h3 className="text-lg font-bold">
                      {usuariosLeidos.length > 0
                        ? formatDate(usuariosLeidos[0].leido_at).split(" a las")[0]
                        : "Sin lecturas"}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <ClockIcon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="lecturas" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="lecturas" className="gap-2">
                <BookOpenCheckIcon className="h-4 w-4" />
                Lecturas
              </TabsTrigger>
              <TabsTrigger value="comentarios" className="gap-2">
                <MessageSquareIcon className="h-4 w-4" />
                Comentarios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lecturas">
              <Card className="shadow-md">
                <CardHeader className="bg-slate-50 pb-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <BookOpenCheckIcon className="h-5 w-5 text-primary" />
                      Registro de Lecturas
                    </CardTitle>

                    <div className="relative w-full md:w-64">
                      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar colaborador..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <CardDescription>Colaboradores que han marcado el comunicado como leído</CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center items-center p-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                  ) : (
                    <>
                      {filteredUsuarios.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpenCheckIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                          <p className="text-muted-foreground">
                            {searchTerm
                              ? "No se encontraron colaboradores que coincidan con la búsqueda."
                              : "Ningún usuario ha marcado lectura aún."}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredUsuarios.map((u, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                                  {getInitials(u.usuario_nomina.colaborador)}
                                </div>
                                <span className="font-medium">{u.usuario_nomina.colaborador}</span>
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                                {formatDate(u.leido_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>

                <CardFooter className="flex justify-between items-center bg-slate-50 py-3 px-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {filteredUsuarios.length} de {usuariosLeidos.length} lecturas
                  </div>

                  
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="comentarios">
              <Card className="shadow-md">
                <CardHeader className="bg-slate-50 pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <MessageSquareIcon className="h-5 w-5 text-primary" />
                    Comentarios
                  </CardTitle>
                  <CardDescription>Comentarios y feedback de los colaboradores</CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="text-center py-8">
                    <MessageSquareIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-muted-foreground mb-6">No hay comentarios para este comunicado.</p>
                    <Button variant="outline" className="gap-2">
                      <MessageSquareIcon className="h-4 w-4" />
                      Habilitar comentarios
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
