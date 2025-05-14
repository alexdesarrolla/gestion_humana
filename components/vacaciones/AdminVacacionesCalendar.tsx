// components/vacaciones/AdminVacacionesCalendar.tsx
"use client"

import React, { useEffect, useState } from "react"
import { DayPicker, SelectRangeEventHandler } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { eachDayOfInterval, isSameDay, format } from "date-fns"
import { es } from "date-fns/locale"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface Disponibilidad {
  id: string
  fecha_inicio: string
  fecha_fin: string
  disponible: boolean
}

interface Vacacion {
  id: string
  fecha_inicio: string
  fecha_fin: string
  usuario_id: string
}

// Navegación de meses personalizada
function MonthNavigation({
  currentMonth,
  setCurrentMonth,
}: {
  currentMonth: Date
  setCurrentMonth: (d: Date) => void
}) {
  const prev = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() - 1)
    setCurrentMonth(d)
  }
  const next = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + 1)
    setCurrentMonth(d)
  }
  const today = () => setCurrentMonth(new Date())

  return (
    <div className="flex items-center justify-between rounded-lg bg-primary/5 p-2 mb-4">
      <Button variant="ghost" size="icon" onClick={prev} className="text-primary hover:bg-primary/10">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={today} className="font-medium hover:bg-primary/10">
        <Calendar className="h-4 w-4 mr-2" />
        {format(currentMonth, "MMMM yyyy", { locale: es })}
      </Button>
      <Button variant="ghost" size="icon" onClick={next} className="text-primary hover:bg-primary/10">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}

// Tarjeta de estadísticas
function StatisticCard({
  title,
  value,
  icon,
  colorClass,
}: {
  title: string
  value: number
  icon: React.ReactNode
  colorClass: string
}) {
  return (
    <div className={`flex items-center p-3 rounded-lg ${colorClass}`}>
      <div className="mr-3">{icon}</div>
      <div>
        <p className="text-sm font-medium opacity-90">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}

export default function AdminVacacionesCalendar({
  empresaId,
}: {
  empresaId: number
}) {
  const supabase = createSupabaseClient()

  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([])
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  type DateRange = { from: Date | undefined; to: Date | undefined }
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Carga datos
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: dispData, error: dispErr } = await supabase
        .from("vacaciones_disponibilidad")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("fecha_inicio", { ascending: true })
      if (dispErr) throw dispErr

      const { data: vacData, error: vacErr } = await supabase
        .from("solicitudes_vacaciones")
        .select("id, fecha_inicio, fecha_fin, usuario_id")
        .eq("estado", "aprobado")
      if (vacErr) throw vacErr

      const uids = Array.from(new Set(vacData.map((v) => v.usuario_id)))
      let usuarios: { auth_user_id: string; empresa_id: number }[] = []
      if (uids.length) {
        const { data: uData, error: uErr } = await supabase
          .from("usuario_nomina")
          .select("auth_user_id, empresa_id")
          .in("auth_user_id", uids)
        if (uErr) throw uErr
        usuarios = uData as { auth_user_id: string; empresa_id: number }[]
      }

      const vacFiltered = vacData.filter((v) => {
        const u = usuarios.find((u) => u.auth_user_id === v.usuario_id)
        return u?.empresa_id === empresaId
      })

      setDisponibilidad(
        (dispData as unknown as Disponibilidad[])?.map((item) => ({
          id: item.id,
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin,
          disponible: item.disponible,
        })) || []
      )
      setVacaciones((vacFiltered || []).map(v => ({
        id: String(v.id),
        fecha_inicio: String(v.fecha_inicio),
        fecha_fin: String(v.fecha_fin), 
        usuario_id: String(v.usuario_id)
      })))
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [empresaId])

  const onSelect: SelectRangeEventHandler = (range) => {
    setSelectedRange(range ? { from: range.from, to: range.to ?? undefined } : { from: undefined, to: undefined })
    setSuccessMessage(null)
  }

  const handleDisable = async () => {
    if (!selectedRange.from || !selectedRange.to) return
    setActionLoading(true)
    setError(null)
    try {
      await supabase.from("vacaciones_disponibilidad").insert([
        {
          empresa_id: empresaId,
          fecha_inicio: selectedRange.from.toISOString().slice(0, 10),
          fecha_fin: selectedRange.to.toISOString().slice(0, 10),
          disponible: false,
        },
      ])
      await fetchData()
      setSelectedRange({ from: undefined, to: undefined })
      setSuccessMessage("Días deshabilitados correctamente")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al deshabilitar días")
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnable = async () => {
    if (!selectedRange.from || !selectedRange.to) return
    setActionLoading(true)
    setError(null)
    try {
      await supabase.from("vacaciones_disponibilidad").insert([
        {
          empresa_id: empresaId,
          fecha_inicio: selectedRange.from.toISOString().slice(0, 10),
          fecha_fin: selectedRange.to.toISOString().slice(0, 10),
          disponible: true,
        },
      ])
      await fetchData()
      setSelectedRange({ from: undefined, to: undefined })
      setSuccessMessage("Días habilitados correctamente")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al habilitar días")
    } finally {
      setActionLoading(false)
    }
  }

  // Construcción de modificadores
  const blockedDays = disponibilidad
    .filter((d) => !d.disponible)
    .flatMap((d) =>
      eachDayOfInterval({
        start: new Date(d.fecha_inicio),
        end: new Date(d.fecha_fin),
      })
    )

  let availableDays = disponibilidad
    .filter((d) => d.disponible)
    .flatMap((d) =>
      eachDayOfInterval({
        start: new Date(d.fecha_inicio),
        end: new Date(d.fecha_fin),
      })
    )
  availableDays = availableDays.filter((day) =>
    !blockedDays.some((b) => isSameDay(b, day))
  )

  const bookedDays = vacaciones.flatMap((v) =>
    eachDayOfInterval({
      start: new Date(v.fecha_inicio),
      end: new Date(v.fecha_fin),
    })
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando calendario…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert variant="default" className="mb-4 bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendario */}
        <div className="lg:col-span-7 flex justify-center">
          <Card className="shadow-lg border-0 w-max">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                Calendario de Vacaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MonthNavigation currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
              <div className="p-3 border rounded-lg bg-white shadow-sm">
                <DayPicker
                  mode="range"
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selected={selectedRange}
                  onSelect={onSelect}
                  disabled={bookedDays}
                  modifiers={{
                    booked: bookedDays,
                    blocked: blockedDays,
                    available: availableDays,
                  }}
                  modifiersClassNames={{
                    booked: "bg-red-500 text-white",
                    blocked: "bg-gray-200 text-gray-500",
                    available: "bg-green-500 text-white",
                    selected: "bg-blue-500 text-white",
                    range_start: "rounded-l-full",
                    range_end: "rounded-r-full",
                    range_middle: "bg-blue-300 text-white",
                  }}
                  numberOfMonths={2}
                  captionLayout="dropdown"
                  locale={es}
                  classNames={{
                    day: "h-10 w-10 text-base font-medium",
                    caption: "hidden",
                    nav: "hidden",
                    months: "flex gap-4",
                    month: "flex-1",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Leyenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-red-500 rounded-full" />
                  <span className="text-sm">Vacaciones aprobadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-gray-200 rounded-full" />
                  <span className="text-sm">Días bloqueados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-green-500 rounded-full" />
                  <span className="text-sm">Días disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-blue-500 rounded-full" />
                  <span className="text-sm">Días seleccionados</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatisticCard
                  title="Días disponibles"
                  value={availableDays.length}
                  icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
                  colorClass="bg-green-50"
                />
                <StatisticCard
                  title="Días bloqueados"
                  value={blockedDays.length}
                  icon={<XCircle className="h-5 w-5 text-gray-600" />}
                  colorClass="bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>

          {selectedRange.from && selectedRange.to && (
            <Card className="shadow-md border-0 bg-blue-50 w-max">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-blue-800">Rango seleccionado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 font-medium text-blue-700">
                  {format(selectedRange.from, "d 'de' MMMM", { locale: es })} al{" "}
                  {format(selectedRange.to, "d 'de' MMMM", { locale: es })}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleEnable}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Habilitar días
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisable}
                    disabled={actionLoading}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Deshabilitar días
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-sm text-muted-foreground bg-white p-3 rounded-lg border shadow-sm">
            Última actualización: {new Date().toLocaleString("es-ES")}
          </div>
        </div>
      </div>
    </div>
  )
}
