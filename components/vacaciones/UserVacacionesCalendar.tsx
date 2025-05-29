"use client"

import React, { useEffect, useState } from "react"
import { DayPicker, SelectRangeEventHandler } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { eachDayOfInterval, format } from "date-fns"
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
} from "lucide-react"
import "./calendar-styles.css"

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

interface UserVacacionesCalendarProps {
  onDateRangeSelect: (range: { from: Date | undefined; to: Date | undefined }) => void
  selectedRange: { from: Date | undefined; to: Date | undefined }
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

export default function UserVacacionesCalendar({ onDateRangeSelect, selectedRange }: UserVacacionesCalendarProps) {
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const supabase = createSupabaseClient()

  const fetchData = async () => {
    try {
      setError(null)
      // Cargar disponibilidad (fechas deshabilitadas)
      const { data: dispData, error: dispErr } = await supabase
        .from("vacaciones_disponibilidad")
        .select("*")
      if (dispErr) throw dispErr

      // Cargar todas las vacaciones aprobadas
      const { data: vacData, error: vacErr } = await supabase
        .from("solicitudes_vacaciones")
        .select("id, fecha_inicio, fecha_fin, usuario_id")
        .eq("estado", "aprobado")
      if (vacErr) throw vacErr

      setDisponibilidad(
        (dispData as unknown as Disponibilidad[])?.map((item) => ({
          id: item.id,
          fecha_inicio: item.fecha_inicio,
          fecha_fin: item.fecha_fin,
          disponible: item.disponible,
        })) || []
      )
      setVacaciones((vacData || []).map(v => ({
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
  }, [])

  const onSelect: SelectRangeEventHandler = (range) => {
    const newRange = range ? { from: range.from, to: range.to ?? undefined } : { from: undefined, to: undefined }
    onDateRangeSelect(newRange)
  }

  // Construcción de modificadores
  const blockedDays = disponibilidad
    .filter((d) => !d.disponible)
    .flatMap((d) => {
      const [startYear, startMonth, startDay] = d.fecha_inicio.split('-').map(Number)
      const [endYear, endMonth, endDay] = d.fecha_fin.split('-').map(Number)
      const start = new Date(startYear, startMonth - 1, startDay)
      const end = new Date(endYear, endMonth - 1, endDay)
      return eachDayOfInterval({ start, end })
    })

  const bookedDays = vacaciones.flatMap((v) => {
    const [startYear, startMonth, startDay] = v.fecha_inicio.split('-').map(Number)
    const [endYear, endMonth, endDay] = v.fecha_fin.split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay)
    const end = new Date(endYear, endMonth - 1, endDay)
    return eachDayOfInterval({ start, end })
  })

  const modifiers = {
    booked: bookedDays,
    blocked: blockedDays,
  }

  const modifiersClassNames = {
    booked: "rdp-day_booked",
    blocked: "rdp-day_blocked",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando calendario...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleccionar fechas de vacaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthNavigation currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
          
          <div className="flex justify-center">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={onSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={es}
              disabled={[...blockedDays, ...bookedDays, { before: new Date() }]}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              className="rdp-custom"
              numberOfMonths={1}
              classNames={{
                day: "h-9 w-9 text-sm font-medium",
                months: "flex justify-center",
                month: "space-y-4",
              }}

            />
          </div>
          
          {/* Leyenda */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
              <span>Días ocupados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
              <span>Días no disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 border border-blue-300 rounded"></div>
              <span>Rango seleccionado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
