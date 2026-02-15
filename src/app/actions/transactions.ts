"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function addTransaction(transaction: {
    player: string;
    amount: number;
    category: string;
    description?: string;
    is_fixed?: boolean;
    installments?: number;
    payment_method?: string;
    card_id?: string;
    date?: string; // YYYY-MM-DD
}) {
    const { player, amount, category, description, is_fixed, installments = 1, payment_method, card_id, date } = transaction;
    const transactionsToAdd = [];
    const baseDate = date ? new Date(date) : new Date();
    // Adjust time to current time if date is today, or noon if future? 
    // Actually, if user picks a date, we probably want to keep the time or just set to noon to avoid timezone issues.
    // Let's create a date object that preserves the selected YYYY-MM-DD.
    // Since input type='date' returns YYYY-MM-DD, new Date('YYYY-MM-DD') creates UTC midnight. 
    // We want local time roughly. Let's append T12:00:00 to be safe or just use the date as is.
    if (date) {
        // If specific date provided, add time to make it ISO
        const [y, m, d] = date.split('-').map(Number);
        baseDate.setFullYear(y, m - 1, d);
        // Keep current time if it's today, otherwise set to fixed time? 
        // Let's just keep the time components from 'now' to imply the transaction happened 'at this time' on that day.
        const now = new Date();
        baseDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    // Generate a group ID if this is an installment purchase
    const installment_group_id = installments > 1 ? crypto.randomUUID() : null;

    for (let i = 0; i < installments; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);

        const desc = installments > 1
            ? `${description || category} (${i + 1}/${installments})`
            : description;

        transactionsToAdd.push({
            player,
            amount,
            category,
            description: desc,
            is_fixed,
            created_at: date.toISOString(),
            installment_group_id,
            payment_method,
            card_id
        });
    }

    const { error } = await supabase
        .from("transactions")
        .insert(transactionsToAdd)
        .select();

    revalidatePath("/dashboard");
    return { success: !error };
}

export async function getTransactions() {
    const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao buscar transações:", error);
        return [];
    }

    return data;
}

export async function deleteTransaction(id: string) {
    // 1. Get the transaction to check for group ID
    const { data: transaction } = await supabase
        .from("transactions")
        .select("installment_group_id")
        .eq("id", id)
        .single();

    let error;

    if (transaction?.installment_group_id) {
        // 2. Delete all transactions in the same group
        const res = await supabase
            .from("transactions")
            .delete()
            .eq("installment_group_id", transaction.installment_group_id);
        error = res.error;
    } else {
        // 3. Delete just the single transaction
        const res = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);
        error = res.error;
    }

    revalidatePath("/dashboard");
    return { success: !error };
}

export async function editTransaction(id: string, transaction: any) {
    // 1. Check if the transaction belongs to a group
    const { data: original } = await supabase
        .from("transactions")
        .select("installment_group_id")
        .eq("id", id)
        .single();

    // 2. Delete the old records (Group or Single)
    if (original?.installment_group_id) {
        await supabase.from("transactions").delete().eq("installment_group_id", original.installment_group_id);
    } else {
        await supabase.from("transactions").delete().eq("id", id);
    }

    // 3. Create new records by calling addTransaction
    // We pass the new data provided by the user. 
    // Note: addTransaction expects specific fields.
    return await addTransaction(transaction);
}
