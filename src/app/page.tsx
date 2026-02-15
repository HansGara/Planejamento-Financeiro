"use client";

import { motion } from "framer-motion";
import { SystemCard } from "@/components/ui/SystemCard";
import { SystemButton } from "@/components/ui/SystemButton";
import { SystemInput } from "@/components/ui/SystemInput";
import { Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = login(username, password);

    if (success) {
      router.push("/dashboard");
    } else {
      setError("Chave de acesso inválida ou usuário não encontrado.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-system-blue)_0%,_transparent_70%)] opacity-5 z-0" />

      <div className="z-10 w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold tracking-widest text-glow mb-2">
            SISTEMA
          </h1>
          <p className="text-system-blue uppercase tracking-[0.2em] text-[10px] font-bold">
            Interface de Controle Financeiro
          </p>
        </motion.div>

        <SystemCard title="Identificação do Jogador" glow className="backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <SystemInput
                placeholder="Nome do Usuário"
                label="Codinome"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<User size={16} />}
                required
              />
              <SystemInput
                type="password"
                placeholder="********"
                label="Senha de Acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={16} />}
                error={error}
                required
              />
            </div>

            <div className="pt-4">
              <SystemButton className="w-full" variant="primary" isLoading={loading}>
                Inicializar Sessão
              </SystemButton>
            </div>
          </form>
        </SystemCard>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            Dica: Use seu nome e nome123 para entrar
          </p>
        </div>
      </div>
    </main>
  );
}
