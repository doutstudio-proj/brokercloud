"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Building2, CheckCircle, ArrowRight, Loader2 } from "lucide-react";

type Tab = "login" | "cadastro";

const testimonials = [
  {
    text: "Aumentei meus fechamentos em 3x em 2 meses. O Aura mudou minha carreira.",
    author: "João Ferreira",
    role: "Corretor Sênior, SP",
    avatar: "JF",
  },
  {
    text: "Controlo todos os meus leads e imóveis em um só lugar. Nunca perco uma oportunidade.",
    author: "Ana Cavalcante",
    role: "Diretora Comercial, RJ",
    avatar: "AC",
  },
  {
    text: "A IA do WhatsApp economiza horas do meu dia. Impressionante.",
    author: "Carlos Mendes",
    role: "Corretor Autônomo, BH",
    avatar: "CM",
  },
];

const features = [
  "Gestão completa de leads e imóveis",
  "Integração WhatsApp com IA",
  "Relatórios financeiros em tempo real",
  "Agenda e tarefas automáticas",
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [isPending, startTransition] = useTransition();
  const [testimonialIdx] = useState(0);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Preencha email e senha.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou senha incorretos.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setError("A senha deve ter no mínimo 8 caracteres (maiúscula, minúscula e número).");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Erro ao criar conta.");
          return;
        }

        // Cadastro OK → login automático
        const result = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });

        if (result?.error) {
          setError("Conta criada! Faça login para continuar.");
          setTab("login");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } catch {
        setError("Erro de conexão. Tente novamente.");
      }
    });
  };

  const currentTestimonial = testimonials[testimonialIdx];

  return (
    <div className="min-h-screen flex">
      {/* ── Lado Esquerdo — Hero Visual ── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0f2744 40%, #0a6136 100%)",
        }}
      >
        {/* Orbs decorativos */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #0a6136 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-100px] left-[-60px] w-[350px] h-[350px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, #1e6b8a 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(10,97,54,0.6)", border: "1px solid rgba(10,97,54,0.5)" }}
          >
            <Building2 size={20} color="#8ad7a2" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Brokercloud</span>
        </div>

        {/* Headline central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 w-fit"
            style={{
              background: "rgba(138, 215, 162, 0.15)",
              border: "1px solid rgba(138, 215, 162, 0.3)",
              color: "#8ad7a2",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Plataforma #1 para corretores
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Gerencie seus imóveis{" "}
            <span style={{ color: "#8ad7a2" }}>com inteligência.</span>
          </h1>
          <p className="text-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
            Do lead ao fechamento — tudo em um só lugar, potencializado por IA.
          </p>

          {/* Features list */}
          <ul className="mt-8 space-y-3">
            {features.map((feat) => (
              <li key={feat} className="flex items-center gap-3">
                <CheckCircle size={16} style={{ color: "#8ad7a2", flexShrink: 0 }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {feat}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <div
          className="relative z-10 p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p className="text-sm italic mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
            &ldquo;{currentTestimonial.text}&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(138, 215, 162, 0.25)", color: "#8ad7a2" }}
            >
              {currentTestimonial.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{currentTestimonial.author}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {currentTestimonial.role}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lado Direito — Formulário ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-white"
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#0a6136" }}
          >
            <Building2 size={18} color="white" />
          </div>
          <span className="text-gray-900 font-bold text-lg">Brokercloud</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Cabeçalho */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {tab === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {tab === "login"
                ? "Entre com suas credenciais para acessar o painel."
                : "Comece gratuitamente. Sem cartão de crédito."}
            </p>
          </div>

          {/* Tabs */}
          <div
            className="flex p-1 rounded-xl mb-8"
            style={{ background: "#f3f4f6" }}
          >
            {(["login", "cadastro"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={
                  tab === t
                    ? {
                        background: "white",
                        color: "#0a6136",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      }
                    : { color: "#6b7280" }
                }
              >
                {t === "login" ? "Login" : "Cadastro"}
              </button>
            ))}
          </div>

          {/* Formulário */}
          <form onSubmit={tab === "login" ? handleLogin : handleRegister} className="space-y-4">
            {/* Nome (só cadastro) */}
            {tab === "cadastro" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="João da Silva"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: "#e5e7eb",
                    background: "#fafafa",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0a6136";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,97,54,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  autoComplete="name"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
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

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
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
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {tab === "login" && (
                <div className="flex justify-end mt-1.5">
                  <a href="/forgot-password" style={{ color: "#0a6136" }} className="text-xs font-medium hover:underline">
                    Esqueceu sua senha?
                  </a>
                </div>
              )}
            </div>

            {/* Confirmar Senha (só cadastro) */}
            {tab === "cadastro" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
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
            )}

            {/* Mensagem de erro */}
            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: "#fef2f2", color: "#dc2626" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Mensagem de sucesso */}
            {success && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: "#f0fdf4", color: "#15803d" }}
              >
                <CheckCircle size={14} />
                {success}
              </div>
            )}

            {/* Botão CTA */}
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
                  {tab === "login" ? "Entrando..." : "Criando conta..."}
                </>
              ) : (
                <>
                  {tab === "login" ? "Entrar no painel" : "Criar minha conta"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Rodapé do card */}
          <p className="text-center text-xs text-gray-400 mt-6">
            {tab === "login" ? (
              <>
                Não tem conta?{" "}
                <button
                  onClick={() => { setTab("cadastro"); setError(""); }}
                  className="font-semibold"
                  style={{ color: "#0a6136" }}
                >
                  Cadastre-se grátis
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  onClick={() => { setTab("login"); setError(""); }}
                  className="font-semibold"
                  style={{ color: "#0a6136" }}
                >
                  Fazer login
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
