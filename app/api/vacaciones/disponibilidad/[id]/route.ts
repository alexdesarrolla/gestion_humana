import { NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("vacaciones_disponibilidad")
    .update(body)
    .eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data[0])
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseClient()
  const { error } = await supabase
    .from("vacaciones_disponibilidad")
    .delete()
    .eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
