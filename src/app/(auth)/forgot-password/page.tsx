"use client";

import { useState, useTransition } from "react";
import { Building2, ArrowRight, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Preencha seu email.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Erro ao processar solicitação.");
          return;
        }

        setSuccess(true);
      } catch {
        setError("Erro de conexão. Tente novamente.");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0a1628] to-[#0a6136]">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white shadow-2xl relative overflow-hidden">
        {/* Decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0a6136]" />

        <div className="flex items-center gap-2 mb-8 justify-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#0a6136" }}
          >
            <Building2 size={20} color="white" />
          </div>
          <span className="text-gray-900 font-bold text-xl">Brokerfield</span>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Email enviado!</h2>
            <p className="text-gray-500 text-sm px-4">
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Por favor, verifique sua caixa de entrada e spam.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border hover:bg-gray-50 transition-colors text-gray-700"
              >
                Voltar para o login
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recuperar senha</h2>
            <p className="text-sm text-gray-500 mb-8">
              Digite seu email abaixo e enviaremos instruções para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email cadastrado
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{ borderColor: "#e5e7eb", background: "#fafafa" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0a6136";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,97,54,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: "#fef2f2", color: "#dc2626" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 relative overflow-hidden group"
                style={{
                  background: isPending ? "#6b9e80" : "#0a6136",
                }}
                onMouseEnter={(e) => {
                  if (!isPending) e.currentTarget.style.background = "#0d7a42";
                }}
                onMouseLeave={(e) => {
                  if (!isPending) e.currentTarget.style.background = "#0a6136";
                }}
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar link de recuperação
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: "#0a6136" }}
              >
                <ArrowLeft size={16} />
                Voltar para o login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
