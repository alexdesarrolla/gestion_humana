// app/administracion/solicitudes/vacaciones/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
import { AdminSidebar } from "@/components/ui/admin-sidebar"
import AdminVacacionesCalendar from "@/components/vacaciones/AdminVacacionesCalendar"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Empresa {
  id: number
  nombre: string
}

export default function AdminVacacionesPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carga todas las empresas
  useEffect(() => {
    async function fetchEmpresas() {
      try {
        const { data, error } = await supabase
          .from("empresas")
          .select("id, nombre")
          .order("nombre", { ascending: true })

        if (error) throw error
        setEmpresas(data || [])
        // por defecto, selecciona la primera empresa
        if (data && data.length > 0) {
          setSelectedEmpresaId(data[0].id)
        }
      } catch (err: any) {
        console.error("Error al cargar empresas:", err.message)
        setError("No se pudo cargar la lista de empresas.")
      } finally {
        setLoading(false)
      }
    }
    fetchEmpresas()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando empresas…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />

      <div className="flex-1 md:pl-64">
        <div className="max-w-[90%] mx-auto py-8">
          <h1 className="text-3xl font-bold mb-6">Calendario de Vacaciones</h1>

          <div className="flex items-center gap-4 mb-8">
            <Label htmlFor="empresa-select" className="min-w-[100px]">
              Empresa
            </Label>
            <Select
              id="empresa-select"
              value={selectedEmpresaId?.toString() || ""}
              onValueChange={(v) => setSelectedEmpresaId(Number(v))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmpresaId ? (
            <AdminVacacionesCalendar empresaId={selectedEmpresaId} />
          ) : (
            <p className="text-gray-500">Selecciona una empresa para ver su calendario.</p>
          )}
        </div>
      </div>
    </div>
  )
}
