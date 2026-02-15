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
    date?: string; // Purchase Date (YYYY-MM-DD)
    competence_date?: string; // Billing Date (YYYY-MM-DD)
}) {
    const {
        player,
        amount,
        category,
        description,
        is_fixed,
        installments = 1,
        payment_method,
        card_id,
        date: purchaseDateStr,
        competence_date: competenceDateStr
    } = transaction;

    const transactionsToAdd = [];
    const basePurchaseDate = purchaseDateStr ? new Date(purchaseDateStr + 'T12:00:00') : new Date();
    const baseCompetenceDate = competenceDateStr ? new Date(competenceDateStr + 'T12:00:00') : new Date(basePurchaseDate);

    // Generate a group ID if this is an installment purchase
    const installment_group_id = installments > 1 ? crypto.randomUUID() : null;

    for (let i = 0; i < installments; i++) {
        const pDate = new Date(basePurchaseDate);
        pDate.setMonth(pDate.getMonth() + i);

        const cDate = new Date(baseCompetenceDate);
        cDate.setMonth(cDate.getMonth() + i);

        const desc = installments > 1
            ? `${description || category} (${i + 1}/${installments})`
            : (description || category);

        transactionsToAdd.push({
            player,
            amount,
            category,
            description: desc,
            is_fixed,
            created_at: pDate.toISOString(), // Legacy created_at fallback
            date: pDate.toISOString().split('T')[0],
            competence_date: cDate.toISOString().split('T')[0],
            installment_group_id,
            payment_method,
            card_id
        });
    }

    const { error } = await supabase
        .from("transactions")
        .insert(transactionsToAdd)
        .select();

    if (error) {
        console.error("Supabase insert error:", error);
    }

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
