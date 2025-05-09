import { NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("solicitudes_vacaciones")
    .update({
      ...body,
      fecha_resolucion: new Date().toISOString(),
    })
    .eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}
