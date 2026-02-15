"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// --- User Settings (Salaries) ---
export async function getUserSettings() {
    const { data, error } = await supabase
        .from("user_settings")
        .select("*");

    if (error) return [];
    return data;
}

export async function updateSalary(player: string, salary: number) {
    const { error } = await supabase
        .from("user_settings")
        .upsert({ player, salary });

    revalidatePath("/dashboard");
    return { success: !error };
}

// --- Recurring Expenses ---
export async function getRecurringExpenses() {
    const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*");

    if (error) return [];
    return data;
}

export async function addRecurringExpense(expense: { description: string, amount: number, player: string, type?: "income" | "expense" }) {
    const { error } = await supabase
        .from("recurring_expenses")
        .insert([{ ...expense, type: expense.type || "expense" }]);

    revalidatePath("/dashboard");
    return { success: !error };
}

export async function deleteRecurringExpense(id: string) {
    const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);

    revalidatePath("/dashboard");
    return { success: !error };
}

// --- Category Goals (Percents) ---
export async function getCategoryGoals() {
    const { data, error } = await supabase
        .from("category_goals")
        .select("*")
        .order("category");

    if (error) return [];
    return data;
}

export async function upsertCategoryGoal(category: string, percentage: number) {
    // Ensure we don't have duplicates via upsert on unique column
    const { error } = await supabase
        .from("category_goals")
        .upsert({ category, percentage }, { onConflict: 'category' });

    revalidatePath("/dashboard");
    return { success: !error };
}

export async function deleteCategoryGoal(id: string) {
    const { error } = await supabase
        .from("category_goals")
        .delete()
        .eq("id", id);

    revalidatePath("/dashboard");
    return { success: !error };
}
