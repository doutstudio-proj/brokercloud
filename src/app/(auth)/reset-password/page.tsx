"use client";

import { Suspense, useState, useTransition, useEffect } from "react";
import { Building2, ArrowRight, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token inválido ou não fornecido na URL.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token ausente. Solicite a recuperação novamente.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("A senha deve ter no mínimo 8 caracteres (maiúscula, minúscula e número).");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Erro ao redefinir a senha.");
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
          <span className="text-gray-900 font-bold text-xl">Brokercloud</span>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Senha alterada!</h2>
            <p className="text-gray-500 text-sm px-4">
              Sua senha foi redefinida com sucesso. Você já pode acessar o sistema com sua nova senha.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200"
                style={{ background: "#0a6136" }}
              >
                Fazer login
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Redefinir senha</h2>
            <p className="text-sm text-gray-500 mb-8">
              Crie uma nova senha segura para a sua conta.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Mín. 8 caracteres (A-z, 0-9)"
                    className="w-full px-4 py-3 pr-12 rounded-xl border text-sm outline-none transition-all"
                    style={{ borderColor: "#e5e7eb", background: "#fafafa" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#0a6136";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,97,54,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-3 pr-12 rounded-xl border text-sm outline-none transition-all"
                    style={{ borderColor: "#e5e7eb", background: "#fafafa" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#0a6136";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,97,54,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
                disabled={isPending || !token}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 relative overflow-hidden group mt-2"
                style={{
                  background: isPending || !token ? "#6b9e80" : "#0a6136",
                }}
                onMouseEnter={(e) => {
                  if (!isPending && token) e.currentTarget.style.background = "#0d7a42";
                }}
                onMouseLeave={(e) => {
                  if (!isPending && token) e.currentTarget.style.background = "#0a6136";
                }}
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Salvar nova senha
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0a1628] to-[#0a6136]"><Loader2 size={32} className="animate-spin text-white" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
