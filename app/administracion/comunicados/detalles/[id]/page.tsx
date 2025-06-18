"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpenCheckIcon,
  BarChart3Icon,
  ClockIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UsersIcon,
  UserRoundX,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Lectura {
  usuario_id: string
  usuario_nomina: {
    colaborador: string | null
  } | null
  leido_at: string
}
interface Destinatario {
  usuario_id: string
  colaborador: string | undefined
}

export default function DetallesComunicadoPage() {
  const router = useRouter()
  const { id: comunicadoId } = useParams() as { id: string }

  const [comunicadoInfo, setComunicadoInfo] = useState<{
    titulo: string
    total_destinatarios: number
  } | null>(null)
  const [usuariosLeidos, setUsuariosLeidos] = useState<Lectura[]>([])
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchData = async () => {
    setLoading(true)
    if (!comunicadoId) return

    try {
      const supabase = createSupabaseClient()

      // 1) Título
      const { data: comData, error: comErr } = await supabase
        .from("comunicados")
        .select("titulo")
        .eq("id", comunicadoId)
        .single()
      if (comErr) throw comErr
      const titulo = comData?.titulo as string

      // 2) Obtener cargos destinatarios del comunicado
      const { data: cargosData, error: cargosErr } = await supabase
        .from("comunicados_cargos")
        .select("cargo_id")
        .eq("comunicado_id", comunicadoId)
      if (cargosErr) throw cargosErr
      const cargoIds = (cargosData || []).map((r) => r.cargo_id)

      // 3) Calcular total destinatarios basado en los cargos
      let totalDest = 0
      if (cargoIds.length > 0) {
        const { count } = await supabase
          .from("usuario_nomina")
          .select("*", { head: true, count: "exact" })
          .in("cargo_id", cargoIds)
        totalDest = count || 0
      }
      
      setComunicadoInfo({
        titulo: titulo,
        total_destinatarios: totalDest,
      })

      // 4) Obtener lecturas
      const { data: lecturasData, error: leErr } = await supabase
        .from("comunicados_leidos")
        .select(`
          usuario_id,
          leido_at,
          usuario_nomina:usuario_id (colaborador)
        `)
        .eq("comunicado_id", comunicadoId)
        .order("leido_at", { ascending: false })
      if (leErr) throw leErr
      const leData = lecturasData || []
      // Convertir explícitamente los datos al tipo Lectura
      const lecturas: Lectura[] = leData.map(item => ({
          usuario_id: item.usuario_id as string,
          usuario_nomina: item.usuario_nomina && typeof item.usuario_nomina === 'object' ? {
            colaborador: (item.usuario_nomina as { colaborador: string | null }).colaborador || "Usuario desconocido"
          } : null,
          leido_at: item.leido_at as string
        }))
      setUsuariosLeidos(lecturas)

      // 5) Obtener todos los destinatarios basados en los cargos
      if (cargoIds.length > 0) {
        const { data: recData = [], error: recErr } = await supabase
          .from("usuario_nomina")
          .select("auth_user_id, colaborador")
          .in("cargo_id", cargoIds)
        
        if (recErr) throw recErr

        // Asegurarse de que recData sea un array antes de mapearlo
        const destinatariosData = Array.isArray(recData) ? recData.map((u) => ({
          usuario_id: u.auth_user_id as string,
          colaborador: u.colaborador as string | undefined,
        })) : []
        
        setDestinatarios(destinatariosData)
      } else {
        setDestinatarios([])
      }
    } catch (err: any) {
      console.error("Error en fetchData:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [comunicadoId])

  const formatDate = (s: string) => {
    const date = new Date(s)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Hoy a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    }
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const porcentajeLecturas =
    comunicadoInfo && comunicadoInfo.total_destinatarios > 0
      ? Math.round(
          (usuariosLeidos.length / comunicadoInfo.total_destinatarios) * 100
        )
      : 0

  const filteredLeidos = usuariosLeidos.filter((u) =>
    u.usuario_nomina?.colaborador
      ?.toLowerCase()
      ?.includes(searchTerm.toLowerCase()) ?? false
  )
  const faltantes = destinatarios.filter(
    (d) => !usuariosLeidos.some((l) => l.usuario_id === d.usuario_id)
  )
  const filteredFaltantes = faltantes.filter((d) =>
    d.colaborador?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 p-6 md:pl-64">
        <div className="max-w-[90%] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="gap-2 -ml-2 mb-2 hover:bg-slate-100"
              >
                <ArrowLeftIcon className="h-4 w-4" /> Volver
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">
                {loading
                  ? "Cargando detalles..."
                  : comunicadoInfo?.titulo || "Detalles"}
              </h1>
              <p className="text-muted-foreground mt-1">
                Estadísticas y seguimiento
              </p>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <Badge variant="outline" className="px-3 py-1">
                <BookOpenCheckIcon className="h-3.5 w-3.5 mr-1" />{" "}
                {usuariosLeidos.length} lecturas
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <UsersIcon className="h-3.5 w-3.5 mr-1" />{" "}
                {comunicadoInfo?.total_destinatarios || 0} destinatarios
              </Badge>
            </div>
          </div>

          {/* Cards resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Lecturas
                    </p>
                    <h3 className="text-2xl font-bold">
                      {usuariosLeidos.length}
                    </h3>
                  </div>
                  <BookOpenCheckIcon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Porcentaje
                    </p>
                    <h3 className="text-2xl font-bold">
                      {porcentajeLecturas}%
                    </h3>
                  </div>
                  <BarChart3Icon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Última lectura
                    </p>
                    <h3 className="text-lg font-bold">
                      {usuariosLeidos.length > 0
                        ? formatDate(usuariosLeidos[0].leido_at).split(" a las")[0]
                        : "Sin lecturas"}
                    </h3>
                  </div>
                  <ClockIcon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pestañas */}
          <Tabs defaultValue="lecturas" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="lecturas">
                <BookOpenCheckIcon className="h-4 w-4 mr-1" /> Lecturas
              </TabsTrigger>
              <TabsTrigger value="faltantes">
                <UserRoundX className="h-4 w-4 mr-1" /> Faltantes
              </TabsTrigger>
            </TabsList>

            {/* Registro de Lecturas */}
            <TabsContent value="lecturas">
              <Card>
                <CardHeader className="bg-slate-50 pb-4 flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <BookOpenCheckIcon className="h-5 w-5 text-primary" />
                      Registro de Lecturas
                    </CardTitle>
                    <CardDescription>
                      Colaboradores que han leído
                    </CardDescription>
                  </div>
                  <Input
                    placeholder="Buscar..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : filteredLeidos.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpenCheckIcon className="h-12 w-12 opacity-20 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? "No se encontraron resultados."
                          : "Aún no hay lecturas."}
                      </p>
                    </div>
                  ) : (
                    filteredLeidos.map((u, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-4 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            {u.usuario_nomina?.colaborador
                              ? u.usuario_nomina.colaborador
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                              : "--"}
                          </div>
                          <span>{u.usuario_nomina?.colaborador || "Usuario desconocido"}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(u.leido_at)}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
                <CardFooter className="bg-slate-50 py-3 px-4 border-t flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Mostrando {filteredLeidos.length} de {usuariosLeidos.length}
                  </span>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Usuarios sin leer */}
            <TabsContent value="faltantes">
              <Card>
                <CardHeader className="bg-slate-50 pb-4 flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <UserRoundX className="h-5 w-5 text-destructive" />
                      Usuarios sin leer
                    </CardTitle>
                    <CardDescription>
                      Destinatarios que no han leído
                    </CardDescription>
                  </div>
                  <Input
                    placeholder="Buscar..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-destructive border-t-transparent" />
                    </div>
                  ) : filteredFaltantes.length === 0 ? (
                    <div className="text-center py-8">
                      <UserRoundX className="h-12 w-12 opacity-20 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? "No se encontraron resultados."
                          : "Todos han leído."}
                      </p>
                    </div>
                  ) : (
                    filteredFaltantes.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-4 hover:bg-slate-50"
                      >
                        <div className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                          {d.colaborador
                            ? d.colaborador
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                            : "--"}
                        </div>
                        <span>{d.colaborador || "Usuario desconocido"}</span>
                      </div>
                    ))
                  )}
                </CardContent>
                <CardFooter className="bg-slate-50 py-3 px-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {filteredFaltantes.length} pendientes de{" "}
                    {comunicadoInfo?.total_destinatarios || 0}
                  </span>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
