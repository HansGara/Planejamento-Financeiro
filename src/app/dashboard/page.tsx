"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SystemCard } from "@/components/ui/SystemCard";
import { SystemButton } from "@/components/ui/SystemButton";
import { SystemInput } from "@/components/ui/SystemInput";
import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Shield, Plus, DollarSign, Wallet, History, Users, X, Calendar, LogOut, CreditCard, Settings, Trash2, PiggyBank, Target, QrCode, Banknote, Landmark } from "lucide-react";
import { addTransaction, getTransactions, deleteTransaction, editTransaction } from "@/app/actions/transactions";
import { getUserSettings, getRecurringExpenses, updateSalary, addRecurringExpense, deleteRecurringExpense, getCategoryGoals, upsertCategoryGoal, deleteCategoryGoal } from "@/app/actions/settings";
import { getCards, addCard, deleteCard } from "@/app/actions/cards";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";

const CATEGORIES = [
    { label: "Mercado", icon: "🛒" },
    { label: "Restaurante", icon: "🍕" },
    { label: "Transporte", icon: "🚗" },
    { label: "Fixo/Lazer", icon: "🏠" },
    { label: "Saúde", icon: "🏥" },
    { label: "Outros", icon: "✨" },
];

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function Dashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [transactions, setTransactions] = useState<any[]>([]);
    const [salaries, setSalaries] = useState<{ player: string, salary: number }[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState<"income" | "expense" | "settings" | "edit" | null>(null);

    // States for the form
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [installments, setInstallments] = useState("1");
    const [selectedCategory, setSelectedCategory] = useState("Outros");
    const [paymentMethod, setPaymentMethod] = useState("pix");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedCardId, setSelectedCardId] = useState("");
    // Helper for local date
    const getToday = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [date, setDate] = useState(getToday());

    const closeModal = () => {
        setAmount("");
        setDescription("");
        setInstallments("1");
        setPaymentMethod("pix");
        setSelectedCardId("");
        setEditingId(null);
        setShowModal(null);
        setDate(getToday());
    }

    // Date auto-shift logic removed as per user request (competence date handled in handleAdd)


    // Settings States
    const [vitorSalary, setVitorSalary] = useState("0");
    const [mariSalary, setMariSalary] = useState("0");
    const [newRecDesc, setNewRecDesc] = useState("");
    const [newRecAmount, setNewRecAmount] = useState("");
    const [newGoalCat, setNewGoalCat] = useState("Mercado");
    const [newGoalPercent, setNewGoalPercent] = useState("");

    // Card Settings States
    const [newCardName, setNewCardName] = useState("");
    const [newCardType, setNewCardType] = useState("credit");
    const [newCardClosing, setNewCardClosing] = useState("");
    const [newCardDue, setNewCardDue] = useState("");

    // Filtering states
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getUTCMonth());
    const [selectedYear, setSelectedYear] = useState(now.getUTCFullYear());
    // const [filterUser, setFilterUser] = useState<string>("Todos"); // Removed as per new logic

    // Constants
    // const salary = 5000; // This could also come from DB later - Removed as per new logic

    useEffect(() => {
        if (!user) {
            router.push("/");
            return;
        }
        fetchData();
    }, [user]);

    async function fetchData() {
        setLoading(true);
        const [tData, sData, rData, gData, cData] = await Promise.all([
            getTransactions(),
            getUserSettings(),
            getRecurringExpenses(),
            getCategoryGoals(),
            getCards()
        ]);
        setTransactions(tData);
        setSalaries(sData);
        setRecurring(rData);
        setGoals(gData);
        setCards(cData);

        const vSalary = sData.find(s => s.player === "Vitor")?.salary || 0;
        const mSalary = sData.find(s => s.player === "Mariana")?.salary || 0;
        setVitorSalary(vSalary.toString());
        setMariSalary(mSalary.toString());

        setLoading(false);
    }


    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0 || !user) return;

        setLoading(true);

        const finalAmount = (showModal === "expense" || (showModal === "edit" && parseFloat(amount) > 0 && editingId && transactions.find(t => t.id === editingId)?.amount < 0))
            ? -parseFloat(amount)
            : parseFloat(amount);

        // Calculate Competence Date (Billing Month)
        let competenceDate = date;
        if ((paymentMethod === 'credit' || paymentMethod === 'debit') && selectedCardId) {
            const card = cards.find(c => c.id === selectedCardId);
            if (card && card.closing_day) {
                const [y, m, d] = date.split('-').map(Number);
                // If purchase day > closing day, bill goes to next month
                if (d > card.closing_day) {
                    const next = new Date(y, m - 1, d); // Month is 0-indexed
                    next.setMonth(next.getMonth() + 1);
                    competenceDate = next.toISOString().split('T')[0];
                }
            }
        }

        const transactionData = {
            player: user.name,
            amount: showModal === "expense" ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)), // Recalculate based on modal type to be safe
            category: selectedCategory,
            description: description || selectedCategory,
            is_fixed: selectedCategory === "Fixo/Lazer",
            installments: parseInt(installments) || 1,
            payment_method: showModal === 'income' ? undefined : paymentMethod,
            card_id: (paymentMethod === 'credit' || paymentMethod === 'debit') ? selectedCardId : undefined,
            date: date, // Purchase Date (e.g. 25/02)
            competence_date: competenceDate // Billing Date (e.g. 25/03)
        };

        if (editingId) {
            await editTransaction(editingId, transactionData);
        } else {
            await addTransaction(transactionData);
        }

        // Full Reset via closeModal
        closeModal();
        await fetchData();
    };

    const handleDelete = async () => {
        if (!editingId) return;
        if (confirm("Tem certeza? Se for parcelado, TODAS as parcelas serão apagadas.")) {
            setLoading(true);
            await deleteTransaction(editingId);
            setEditingId(null);
            setShowModal(null);
            await fetchData();
        }
    }

    const openEdit = (t: any) => {
        setAmount(Math.abs(t.amount).toString());
        // Clean description from potential installment tag for editing clarity? 
        // Or keep it? If we keep "Item (1/10)" and save as 12 installments, it might become "Item (1/10) (1/12)".
        // We should strip the tag.
        const descMatch = t.description?.match(/^(.*) \(\d+\/\d+\)$/);
        const cleanDesc = descMatch ? descMatch[1] : (t.description || t.category);
        const installMatch = t.description?.match(/\(\d+\/(\d+)\)/);

        setDescription(cleanDesc);
        setInstallments(installMatch ? installMatch[1] : "1");
        setSelectedCategory(t.category);
        setEditingId(t.id);

        // Use t.date string if available, otherwise fallback to created_at
        const displayDate = t.date || (t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : getToday());
        setDate(displayDate);

        // Load Payment info if any
        if (t.payment_method) setPaymentMethod(t.payment_method);
        if (t.card_id) setSelectedCardId(t.card_id);

        setShowModal(t.amount < 0 ? "expense" : "income");
    }

    const handleAddCard = async () => {
        if (!newCardName || !user) return;
        await addCard({
            player: user.name,
            name: newCardName,
            type: newCardType as any,
            closing_day: newCardClosing ? parseInt(newCardClosing) : undefined,
            due_day: newCardDue ? parseInt(newCardDue) : undefined
        });
        setNewCardName("");
        setNewCardClosing("");
        setNewCardDue("");
        await fetchData();
    };

    const handleUpdateSalaries = async () => {
        await updateSalary("Vitor", parseFloat(vitorSalary));
        await updateSalary("Mariana", parseFloat(mariSalary));
        await fetchData();
    };

    const handleAddRecurring = async (type: "expense" | "income") => {
        if (!newRecDesc || !newRecAmount) return;
        await addRecurringExpense({
            description: newRecDesc,
            amount: parseFloat(newRecAmount),
            player: user?.name || "Sistema",
            type // 'income' or 'expense'
        });
        setNewRecDesc("");
        setNewRecAmount("");
        await fetchData();
    };

    const handleUpsertGoal = async () => {
        if (!newGoalCat || !newGoalPercent) return;
        await upsertCategoryGoal(newGoalCat, parseFloat(newGoalPercent));
        setNewGoalPercent("");
        await fetchData();
    };

    // Filtered Data
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Priority: Competence Date -> Date (Purchase) -> Created At
            const dateStr = t.competence_date || t.date || t.created_at;
            // Handle ISO string or YYYY-MM-DD
            const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');

            const mMatch = d.getMonth() === selectedMonth;
            const yMatch = d.getFullYear() === selectedYear;
            return mMatch && yMatch;
        });
    }, [transactions, selectedMonth, selectedYear]);

    const totalSpent = Math.abs(
        filteredTransactions
            .filter((t) => t.amount < 0)
            .reduce((acc, t) => acc + parseFloat(t.amount), 0)
    );

    const totalIncome = filteredTransactions
        .filter((t) => t.amount > 0)
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const totalSalaries = salaries.reduce((acc, s) => acc + parseFloat(s.salary.toString()), 0);

    // Split recurring
    const recurringExpenses = recurring.filter(r => r.type !== 'income').reduce((acc, r) => acc + parseFloat(r.amount.toString()), 0);
    const recurringIncome = recurring.filter(r => r.type === 'income').reduce((acc, r) => acc + parseFloat(r.amount.toString()), 0);

    const combinedIncome = totalSalaries + totalIncome + recurringIncome;
    const combinedExpenses = totalSpent + recurringExpenses;
    const currentBalance = combinedIncome - combinedExpenses;

    const getSpentByCategory = (catName: string) => {
        return Math.abs(
            filteredTransactions
                .filter((t) => t.category.toLowerCase().includes(catName.toLowerCase()))
                .reduce((acc, t) => acc + parseFloat(t.amount), 0)
        );
    };

    if (!user) return null;

    return (
        <div className="min-h-screen p-4 pb-32 relative bg-black text-white">
            {/* Background Blur Effect */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-system-blue/10 blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex justify-between items-start mb-6 pt-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-system-blue/50 flex items-center justify-center bg-system-blue/5">
                        <Users size={20} className="text-system-blue" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Jogadores</p>
                        <h2 className="text-sm font-bold">Vitor & Mariana</h2>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowModal("settings")} className="p-2 text-gray-500 hover:text-system-blue animate-pulse"><Settings size={20} /></button>
                    <button onClick={() => { logout(); router.push("/"); }} className="p-2 text-gray-500 hover:text-system-danger"><LogOut size={20} /></button>
                </div>
            </div>

            {/* Monthly Filter Bar */}
            <div className="relative z-10 flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
                <div className="flex bg-system-dark/50 border border-system-border rounded-lg p-1">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="bg-transparent text-xs font-bold uppercase py-1 px-2 outline-none cursor-pointer border-r border-system-border"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={m} value={i} className="bg-system-dark">{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-transparent text-xs font-bold py-1 px-2 outline-none cursor-pointer"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y} className="bg-system-dark">{y}</option>
                        ))}
                    </select>
                </div>

                {/* Removed filterUser dropdown */}
                {/* <div className="flex bg-system-dark/50 border border-system-border rounded-lg p-1">
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="bg-transparent text-xs font-bold uppercase py-1 px-2 outline-none cursor-pointer"
                    >
                        <option value="Todos" className="bg-system-dark">TUDO</option>
                        <option value="Vitor" className="bg-system-dark">VITOR</option>
                        <option value="Mariana" className="bg-system-dark">MARIANA</option>
                    </select>
                </div> */}
            </div>

            {/* Main Combined Stats */}
            <div className="grid grid-cols-1 gap-4 mb-6 relative z-10">
                <SystemCard title="Status do Casal" glow>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 border-b border-system-border/30 pb-4">
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Renda Total</p>
                                <p className="text-xl font-bold text-system-success">R$ {combinedIncome.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Gasto Total (Variável + Fixo)</p>
                                <p className="text-xl font-bold text-system-danger">R$ {combinedExpenses.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-system-blue/10 rounded-lg">
                                    <PiggyBank className="text-system-blue" size={24} />
                                </div>
                                <div>
                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">O Cofre (Saldo)</p>
                                    <p className={`text-2xl font-black ${currentBalance < 0 ? 'text-system-danger' : 'text-white text-glow'}`}>
                                        R$ {currentBalance.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-system-blue font-bold uppercase tracking-tighter">
                                    {combinedIncome > 0 ? ((currentBalance / combinedIncome) * 100).toFixed(0) : 0}% Economizado
                                </p>
                            </div>
                        </div>

                        <div className="w-full bg-system-dark/50 border border-system-border h-2 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(0, Math.min((currentBalance / combinedIncome) * 100, 100))}%` }}
                                className="h-full bg-system-blue shadow-[0_0_15px_#00a3ff]"
                            />
                        </div>
                    </div>
                </SystemCard>

                {/* Dynamic Goals */}
                <div className="grid grid-cols-2 gap-4">
                    {goals.map((goal) => {
                        const budget = totalSalaries * (goal.percentage / 100);
                        const spent = getSpentByCategory(goal.category);
                        const percent = Math.min((spent / budget) * 100, 100);
                        const isOver = spent > budget;

                        return (
                            <SystemCard key={goal.id} className="p-4" title={`${goal.category} (${goal.percentage}%)`}>
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className={`text-lg font-bold ${isOver ? 'text-system-danger' : 'text-system-blue'}`}>
                                        R$ {spent.toFixed(0)}
                                    </p>
                                    <span className="text-[10px] text-gray-600">Limite R$ {budget.toFixed(0)}</span>
                                </div>
                                <div className="w-full bg-system-dark border border-system-border h-1 rounded-full overflow-hidden">
                                    <motion.div
                                        animate={{ width: `${percent}%` }}
                                        className={`h-full ${isOver ? 'bg-system-danger' : 'bg-system-blue'}`}
                                    />
                                </div>
                            </SystemCard>
                        );
                    })}
                </div>
            </div>

            {/* Simple History */}
            <div className="mt-4 relative z-10">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 flex items-center gap-2">
                    <History size={14} /> Movimentações Recentes
                </h3>
                <div className="space-y-2">
                    {filteredTransactions.slice(0, 10).map((t) => {
                        const date = new Date(t.created_at);
                        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                        // Icon mapping based on t.payment_method and t.card_id
                        let PaymentIcon = null;
                        if (t.payment_method === 'pix') PaymentIcon = <QrCode size={12} className="text-emerald-400" />;
                        else if (t.payment_method === 'cash') PaymentIcon = <Banknote size={12} className="text-green-400" />;
                        else if (t.payment_method === 'credit' || t.payment_method === 'debit') {
                            const card = cards.find(c => c.id === t.card_id);
                            PaymentIcon = <div className="flex items-center gap-1"><CreditCard size={12} className="text-system-blue" /> <span className="text-[8px] uppercase">{card ? card.name : t.payment_method}</span></div>;
                        }

                        return (
                            <div key={t.id} className="system-card p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center bg-system-dark/30 border border-transparent hover:border-system-blue/20 transition-all group gap-2">
                                <div className="flex items-start gap-3 w-full sm:w-auto overflow-hidden">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex shrink-0 items-center justify-center border border-white/5 ${t.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        <span className="text-xl sm:text-2xl">{CATEGORIES.find(c => c.label === t.category)?.icon || "💰"}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-xs sm:text-sm font-bold uppercase tracking-tight mb-0.5 truncate">{t.description || t.category}</p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase leading-none">
                                            <span className="text-system-blue font-bold">{t.player}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                                            <span>{dateStr}</span>
                                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-gray-700" />
                                            <span className="hidden sm:inline">{timeStr}</span>
                                            {PaymentIcon && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                    <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-gray-300">
                                                        {PaymentIcon}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 pl-14 sm:pl-0 mt-[-10px] sm:mt-0">
                                    <span className={`font-mono font-bold text-base sm:text-lg ${t.amount > 0 ? 'text-emerald-500' : 'text-white'}`}>
                                        {t.amount > 0 ? '+' : '-'} R$ {Math.abs(t.amount).toFixed(2)}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                                        className="p-2 text-gray-600 hover:text-system-blue hover:bg-system-blue/10 rounded-lg transition-all"
                                        title="Editar Transação"
                                    >
                                        <Settings size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recurring Expenses & Incomes Section */}
            <div className="mt-8 relative z-10 mb-20">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 flex items-center gap-2">
                    <Calendar size={14} /> Compromissos Fixos
                </h3>
                <div className="space-y-2">
                    {recurring.map((r) => (
                        <div key={r.id} className="system-card p-3 rounded-xl flex justify-between items-center bg-system-dark/20 border border-white/5 opacity-80">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg text-gray-400 ${r.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {r.type === 'income' ? <TrendingUp size={16} /> : <CreditCard size={16} />}
                                </div>
                                <div>
                                    <p className="text-gray-300 text-xs font-bold uppercase tracking-tight">{r.description}</p>
                                    <p className="text-[9px] text-gray-500 uppercase flex items-center gap-1">
                                        {r.player} <span className="text-gray-600">•</span> {r.type === 'income' ? 'Receita Fixa' : 'Despesa Fixa'}
                                    </p>
                                </div>
                            </div>
                            <span className={`font-mono font-bold ${r.type === 'income' ? 'text-emerald-500' : 'text-gray-400'}`}>
                                {r.type === 'income' ? '+' : '-'} R$ {parseFloat(r.amount).toFixed(2)}
                            </span>
                        </div>
                    ))}
                    {recurring.length === 0 && (
                        <p className="text-xs text-gray-600 italic pl-2">Nenhum compromisso fixo cadastrado.</p>
                    )}
                </div>
            </div>

            {/* Floating Actions */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 flex gap-3 z-40">
                <button
                    onClick={() => setShowModal("income")}
                    className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 border-2 border-emerald-400/20"
                >
                    <TrendingUp size={20} /> Ganho
                </button>
                <button
                    onClick={() => setShowModal("expense")}
                    className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 border-2 border-red-400/20"
                >
                    <TrendingDown size={20} /> Gasto
                </button>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showModal === 'settings' && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(null)} />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-system-dark border-t border-system-blue/30 p-6 sm:rounded-2xl h-[85vh] flex flex-col">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h2 className="text-white font-black tracking-widest uppercase flex items-center gap-2 text-sm"><Settings size={16} /> Configurações do Sistema</h2>
                                <button onClick={() => setShowModal(null)}><X size={20} /></button>
                            </div>

                            <div className="space-y-8 overflow-y-auto no-scrollbar pb-6 flex-1">
                                {/* 1. Salaries */}
                                <div className="space-y-4">
                                    <p className="text-[10px] text-system-blue font-black uppercase tracking-widest border-b border-system-blue/20 pb-2 flex items-center gap-2">
                                        <Wallet size={12} /> Salários (Renda Mensal)
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <SystemInput label="Vitor" type="number" value={vitorSalary} onChange={e => setVitorSalary(e.target.value)} />
                                        <SystemInput label="Mariana" type="number" value={mariSalary} onChange={e => setMariSalary(e.target.value)} />
                                    </div>
                                    <SystemButton variant="outline" className="w-full" onClick={handleUpdateSalaries}>Salvar Salários</SystemButton>
                                </div>

                                {/* 2. Cards (The Arsenal) */}
                                <div className="space-y-4">
                                    <p className="text-[10px] text-system-blue font-black uppercase tracking-widest border-b border-system-blue/20 pb-2 flex items-center gap-2">
                                        <CreditCard size={12} /> Carteira & Cartões
                                    </p>
                                    <div className="space-y-2">
                                        {cards.filter(c => c.player === user.name).map(c => (
                                            <div key={c.id} className="flex justify-between items-center p-3 bg-black/40 border border-system-border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard size={16} className={c.type === 'credit' ? 'text-system-blue' : 'text-emerald-500'} />
                                                    <div>
                                                        <p className="text-xs text-white uppercase font-bold">{c.name}</p>
                                                        <p className="text-[9px] text-gray-500 uppercase">{c.type === 'both' ? 'Crédito/Débito' : c.type === 'credit' ? 'Crédito' : 'Débito'} {c.closing_day ? `• Fecha dia ${c.closing_day}` : ''}</p>
                                                    </div>
                                                </div>
                                                <button onClick={async () => { await deleteCard(c.id); await fetchData(); }} className="text-gray-600 hover:text-system-danger"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        {cards.filter(c => c.player === user.name).length === 0 && <p className="text-xs text-gray-600 italic">Nenhum cartão cadastrado.</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Nome (Ex: Nubank)" value={newCardName} onChange={e => setNewCardName(e.target.value)} className="col-span-2 bg-black/40 border border-system-border rounded-lg p-3 text-xs outline-none focus:border-system-blue text-white" />
                                        <select value={newCardType} onChange={e => setNewCardType(e.target.value)} className="bg-black/40 border border-system-border rounded-lg p-3 text-xs outline-none text-white appearance-none">
                                            <option value="credit">Crédito</option>
                                            <option value="debit">Débito</option>
                                            <option value="both">Ambos</option>
                                        </select>
                                        <div className="flex gap-1 col-span-1">
                                            <input placeholder="Fech." type="number" value={newCardClosing} onChange={e => setNewCardClosing(e.target.value)} className="w-1/2 bg-black/40 border border-system-border rounded-lg p-3 text-xs outline-none focus:border-system-blue text-white text-center" />
                                            <input placeholder="Venc." type="number" value={newCardDue} onChange={e => setNewCardDue(e.target.value)} className="w-1/2 bg-black/40 border border-system-border rounded-lg p-3 text-xs outline-none focus:border-system-blue text-white text-center" />
                                        </div>
                                        <button onClick={handleAddCard} className="col-span-2 bg-system-blue/10 border border-system-blue p-3 rounded-lg text-system-blue flex justify-center items-center gap-2"><Plus size={14} /> Adicionar Cartão</button>
                                    </div>
                                </div>

                                {/* 3. Category Goals */}
                                <div className="space-y-4">
                                    <p className="text-[10px] text-system-blue font-black uppercase tracking-widest border-b border-system-blue/20 pb-2 flex items-center gap-2">
                                        <Target size={12} /> Metas de Categoria (%)
                                    </p>
                                    <div className="space-y-2">
                                        {goals.map(g => (
                                            <div key={g.id} className="flex justify-between items-center p-3 bg-black/40 border border-system-border rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{CATEGORIES.find(c => c.label === g.category)?.icon || "🎯"}</span>
                                                    <p className="text-xs text-white uppercase font-bold">{g.category}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs font-bold text-system-blue">{g.percentage}%</p>
                                                    <button onClick={async () => { await deleteCategoryGoal(g.id); await fetchData(); }} className="text-gray-600 hover:text-system-danger"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black/40 border border-system-border rounded-lg p-1">
                                            <select value={newGoalCat} onChange={e => setNewGoalCat(e.target.value)} className="w-full bg-transparent text-xs text-white outline-none p-2">
                                                {CATEGORIES.map(c => <option key={c.label} value={c.label} className="bg-system-dark">{c.icon} {c.label}</option>)}
                                            </select>
                                        </div>
                                        <input placeholder="%" type="number" value={newGoalPercent} onChange={e => setNewGoalPercent(e.target.value)} className="bg-black/40 border border-system-border rounded-lg p-3 text-xs w-16 outline-none focus:border-system-blue text-white" />
                                        <button onClick={handleUpsertGoal} className="bg-system-blue/10 border border-system-blue p-3 rounded-lg text-system-blue"><Plus size={18} /></button>
                                    </div>
                                </div>

                                {/* 4. Recurring Items (Expenses & Income) */}
                                <div className="space-y-4">
                                    <p className="text-[10px] text-system-blue font-black uppercase tracking-widest border-b border-system-blue/20 pb-2 flex items-center gap-2">
                                        <Calendar size={12} /> Fixos & Assinaturas
                                    </p>

                                    {/* Expenses List */}
                                    <div className="space-y-2">
                                        <p className="text-[9px] text-gray-500 uppercase font-black">Saídas Fixas (Aluguel, Internet...)</p>
                                        {recurring.filter(r => r.type !== 'income').map(r => (
                                            <div key={r.id} className="flex justify-between items-center p-3 bg-black/40 border border-system-border rounded-lg">
                                                <p className="text-xs text-white">{r.description}</p>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs font-bold text-system-danger">- R$ {parseFloat(r.amount).toFixed(2)}</p>
                                                    <button onClick={async () => { await deleteRecurringExpense(r.id); await fetchData(); }} className="text-gray-600 hover:text-system-danger"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Income List */}
                                    <div className="space-y-2 pt-2">
                                        <p className="text-[9px] text-gray-500 uppercase font-black">Entradas Fixas (Vale, Bônus...)</p>
                                        {recurring.filter(r => r.type === 'income').map(r => (
                                            <div key={r.id} className="flex justify-between items-center p-3 bg-black/40 border border-system-border rounded-lg">
                                                <p className="text-xs text-white">{r.description}</p>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs font-bold text-system-success">+ R$ {parseFloat(r.amount).toFixed(2)}</p>
                                                    <button onClick={async () => { await deleteRecurringExpense(r.id); await fetchData(); }} className="text-gray-600 hover:text-system-danger"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Form */}
                                    <div className="flex gap-2 items-center">
                                        <input placeholder="Desc: Vale Alimentação" value={newRecDesc} onChange={e => setNewRecDesc(e.target.value)} className="bg-black/40 border border-system-border rounded-lg p-3 text-xs flex-1 outline-none focus:border-system-blue text-white" />
                                        <input placeholder="R$ 0,00" type="number" value={newRecAmount} onChange={e => setNewRecAmount(e.target.value)} className="bg-black/40 border border-system-border rounded-lg p-3 text-xs w-20 outline-none focus:border-system-blue text-white" />
                                        <div className="flex gap-1">
                                            <button onClick={() => handleAddRecurring('income')} className="bg-system-success/10 border border-system-success p-3 rounded-lg text-system-success" title="Adicionar Receita"><Plus size={18} /></button>
                                            <button onClick={() => handleAddRecurring('expense')} className="bg-system-danger/10 border border-system-danger p-3 rounded-lg text-system-danger" title="Adicionar Despesa"><TrendingDown size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}


                {(showModal === 'income' || showModal === 'expense' || showModal === 'edit') && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                            onClick={closeModal}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative w-full sm:max-w-md bg-system-dark border-t sm:border border-system-blue/30 p-5 h-full sm:h-auto sm:rounded-2xl flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <h2 className="text-white font-black tracking-widest uppercase flex items-center gap-2 text-xs">
                                    {showModal === 'income' ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
                                    {showModal === 'income' ? 'Novo Ganho' : 'Novo Gasto'}
                                </h2>
                                <button onClick={closeModal} className="p-2 bg-white/5 rounded-full"><X size={18} /></button>
                            </div>

                            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto no-scrollbar space-y-5">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">R$</span>
                                        <input
                                            autoFocus
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full bg-transparent text-4xl font-black text-white outline-none pl-8 placeholder-gray-700"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Descrição (Ex: Pizza)"
                                        className="w-full bg-black/40 border border-system-border rounded-xl p-3 text-white placeholder-gray-600 outline-none focus:border-system-blue transition-all font-bold text-lg"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[9px] text-gray-500 uppercase font-black tracking-widest pl-1 mb-1 block">Data Compra</label>
                                        <input
                                            type="date"
                                            className="w-full bg-black/40 border border-system-border rounded-xl p-3 text-white uppercase text-xs font-bold outline-none [color-scheme:dark]"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[9px] text-gray-500 uppercase font-black tracking-widest pl-1 mb-1 block">Parcelas</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full bg-black/40 border border-system-border rounded-xl p-3 text-center text-white outline-none font-bold text-sm"
                                                value={installments}
                                                onChange={(e) => setInstallments(e.target.value)}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs font-bold">x</span>
                                        </div>
                                    </div>
                                </div>

                                {(showModal === 'expense' || (showModal === 'edit' && parseFloat(amount) < 0)) && (
                                    <div className="bg-black/20 p-2 rounded-xl space-y-2">
                                        <div className="grid grid-cols-4 gap-1">
                                            {[
                                                { id: 'pix', label: 'Pix', icon: <QrCode size={14} /> },
                                                { id: 'cash', label: 'Din', icon: <Banknote size={14} /> },
                                                { id: 'credit', label: 'Créd', icon: <CreditCard size={14} /> },
                                                { id: 'debit', label: 'Déb', icon: <CreditCard size={14} /> }
                                            ].map(m => (
                                                <button
                                                    type="button"
                                                    key={m.id}
                                                    onClick={() => setPaymentMethod(m.id)}
                                                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${paymentMethod === m.id ? 'bg-system-blue text-white shadow-lg' : 'text-gray-500 hover:text-white bg-white/5'}`}
                                                >
                                                    {m.icon}
                                                    <span className="text-[9px] font-bold uppercase">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                                            <select
                                                value={selectedCardId}
                                                onChange={e => setSelectedCardId(e.target.value)}
                                                className="w-full bg-black/40 border border-system-border rounded-lg p-2 text-white outline-none text-xs font-bold"
                                                required
                                            >
                                                <option value="">Selecione o Cartão...</option>
                                                {cards.filter(c => c.player === user.name && (c.type === 'both' || c.type === paymentMethod)).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} {c.closing_day ? `(Fecha dia ${c.closing_day})` : ''}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 pl-1">Categoria</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.label}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat.label)}
                                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedCategory === cat.label
                                                    ? "bg-system-blue border-system-blue text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                                                    : "bg-black/40 border-system-border text-gray-400 hover:border-system-blue/50 hover:text-white"
                                                    }`}
                                            >
                                                <span className="text-xl">{cat.icon}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 pb-6 sm:pb-0">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                    >
                                        {loading ? "Salvando..." : (editingId ? 'Salvar' : 'Adicionar')}
                                    </button>

                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="w-full mt-3 p-3 text-system-danger text-[10px] font-black uppercase tracking-widest hover:bg-system-danger/10 rounded-lg transition-all"
                                        >
                                            Excluir
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
