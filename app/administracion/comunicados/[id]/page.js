import { createSupabaseClient } from "@/lib/supabase"

export async function generateStaticParams() {
    const supabase = createSupabaseClient()
    const { data: comunicados } = await supabase
        .from("comunicados")
        .select("id")

    return comunicados?.map((comunicado) => ({
        id: comunicado.id,
    })) || []
}