// components/vacaciones/AdminVacacionesCalendar.tsx
"use client"

import React, { useEffect, useState } from "react"
import { DayPicker, SelectRangeEventHandler } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { eachDayOfInterval, isSameDay } from "date-fns"
import { createSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

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

export default function AdminVacacionesCalendar({
  empresaId,
}: {
  empresaId: number
}) {
  const supabase = createSupabaseClient()

  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [vacaciones, setVacaciones]         = useState<Vacacion[]>([])
  const [selectedRange, setSelectedRange]   = useState<{ from?: Date; to?: Date }>({})
  const [loading, setLoading]               = useState(true)
  const [actionLoading, setActionLoading]   = useState(false)
  const [error, setError]                   = useState<string | null>(null)

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

      const userIds = Array.from(new Set(vacData.map((v) => v.usuario_id)))
      let usuarios: { auth_user_id: string; empresa_id: number }[] = []
      if (userIds.length) {
        const { data: uData, error: uErr } = await supabase
          .from("usuario_nomina")
          .select("auth_user_id, empresa_id")
          .in("auth_user_id", userIds)
        if (uErr) throw uErr
        usuarios = uData
      }

      const vacFiltered = vacData.filter((v) => {
        const u = usuarios.find((u) => u.auth_user_id === v.usuario_id)
        return u?.empresa_id === empresaId
      })

      setDisponibilidad(dispData || [])
      setVacaciones(vacFiltered || [])
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

  // Solo guarda cuando el admin pulse el botón
  const onSelect: SelectRangeEventHandler = (range) => {
    setSelectedRange(range)
  }

  // Inserta rango bloqueado
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
      setSelectedRange({})
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al deshabilitar")
    } finally {
      setActionLoading(false)
    }
  }

  // Inserta rango habilitado
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
      setSelectedRange({})
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al habilitar")
    } finally {
      setActionLoading(false)
    }
  }

  // Calcula los días para los modificadores
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
  // Quita de availableDays los que están en blockedDays
  availableDays = availableDays.filter(
    (day) => !blockedDays.some((b) => isSameDay(b, day))
  )

  const bookedDays = vacaciones.flatMap((v) =>
    eachDayOfInterval({
      start: new Date(v.fecha_inicio),
      end: new Date(v.fecha_fin),
    })
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin mr-2" /> Cargando…
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold">
          Calendario de Vacaciones (Admin)
        </h2>
        <Badge variant="outline">Selecciona un rango</Badge>
      </div>

      {error && <div className="mb-4 text-red-600">Error: {error}</div>}

      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={onSelect}
        // Solo bloquea las vacaciones aprobadas
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
      />

      {selectedRange.from && selectedRange.to && (
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={handleEnable} disabled={actionLoading}>
            {actionLoading && <Loader2 className="animate-spin mr-2" />}
            Habilitar días
          </Button>
          <Button variant="outline" onClick={handleDisable} disabled={actionLoading}>
            {actionLoading && <Loader2 className="animate-spin mr-2" />}
            Deshabilitar días
          </Button>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-medium mb-2">Leyenda:</h3>
        <div className="flex gap-4 flex-wrap">
          <Badge variant="destructive">Vacaciones aprobadas</Badge>
          <Badge variant="outline">Días bloqueados</Badge>
          <Badge variant="success">Días disponibles</Badge>
        </div>
      </div>
    </div>
  )
}
