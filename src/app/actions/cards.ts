"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function getCards() {
    const { data, error } = await supabase
        .from("cards")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Erro ao buscar cartões:", error);
        return [];
    }

    return data;
}

export async function addCard(card: {
    player: string;
    name: string;
    type: "credit" | "debit" | "both";
    closing_day?: number;
    due_day?: number;
}) {
    const { error } = await supabase.from("cards").insert([card]);
    revalidatePath("/dashboard");
    return { success: !error };
}

export async function deleteCard(id: string) {
    const { error } = await supabase.from("cards").delete().eq("id", id);
    revalidatePath("/dashboard");
    return { success: !error };
}
