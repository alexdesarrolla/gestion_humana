"use client"

import React, { useEffect, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase"
import AdminVacacionesCalendar from "@/components/vacaciones/AdminVacacionesCalendar"

export default function AdminVacacionesPage() {
  const supabase = createSupabaseClient()
  const [empresaId, setEmpresaId] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase
        .from("usuario_nomina")
        .select("empresa_id")
        .eq("auth_user_id", session.user.id)
        .single()
        .then(({ data }) => setEmpresaId(data?.empresa_id))
    })
  }, [supabase])

  if (!empresaId) return <p>Cargando empresa...</p>
  return (
    <div className="max-w-[90%] mx-auto py-8 md:pl-64">
      <AdminVacacionesCalendar empresaId={empresaId} />
    </div>
  )
}
