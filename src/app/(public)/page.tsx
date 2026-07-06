import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      {/* Header / TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-[40px] border-b border-glass-border shadow-sm">
        <nav className="flex justify-between items-center px-4 md:px-10 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo1.png" alt="Brokercloud Logo" className="h-10 w-auto object-contain" />
            <span className="font-display-lg text-2xl font-extrabold text-primary">Brokercloud</span>
          </Link>
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a className="text-primary font-bold border-b-2 border-primary font-body-md text-sm" href="#">Soluções</a>
            <a className="text-secondary hover:text-primary transition-colors font-body-md text-sm" href="#">Integrações</a>
            <a className="text-secondary hover:text-primary transition-colors font-body-md text-sm" href="#">IA</a>
            <a className="text-secondary hover:text-primary transition-colors font-body-md text-sm" href="#planos">Preços</a>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link className="hidden md:block text-primary font-bold font-body-md text-sm hover:opacity-80 transition-opacity" href="/login">Login</Link>
            <Link className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm active:scale-95 transition-all duration-200" href="/login?tab=register">Teste Grátis</Link>
          </div>
        </nav>
      </header>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[921px] flex items-center overflow-hidden px-4 md:px-10 py-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-xs font-bold shadow-sm border border-primary/10">
                <span>✨ O futuro do mercado imobiliário chegou</span>
              </div>
              <h1 className="font-display-lg text-[48px] md:text-[64px] leading-tight text-primary font-extrabold">
                Transforme conversas em <span className="gradient-text">Vendas Milionárias</span>
              </h1>
              <p className="font-body-lg text-lg text-on-surface-variant max-w-lg">
                O único CRM focado em inteligência artificial que organiza seu WhatsApp, cria apresentações impecáveis e automatiza seu funil de vendas.
              </p>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Link href="/login?tab=register" className="w-full sm:w-auto bg-primary text-on-primary px-10 py-5 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group">
                    Começar Teste Grátis
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </Link>
                  <span className="text-on-surface-variant font-label-sm text-xs font-semibold">
                    Teste GRÁTIS por 3 dias.<br/>Cancele quando quiser.
                  </span>
                </div>
              </div>
            </div>
            
            {/* Hero Image / Glass Panel Mockup */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-primary/5 rounded-[40px] blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>
              <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl border border-white/50 aspect-[4/3] relative">
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_Mbxj6zXFOIMWGU1D1Kq_0zUgC0vS4W5HtBb1bkwhD9Bic2g4DFS8uLdj8kX4fjeRRjZW5bqL-23rSjGyWr3U5VkP8qq9_P9oJ2XekdKL4oNq6xyS7QP2_geDmrIm0fpol6MQhYNVsaWxHRoHGeKqYowjxF5qEcRcsmoqKqmoUHzpQjY5MAWpGhttA-d89f43RWLKhm1Bl4tV4vxdyODUfE4GuFaAfYMejvv87T4HNxEDeEZxXSI')" }}></div>
                {/* Floating Glass UI Elements */}
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    </div>
                    <div>
                      <p className="font-label-sm text-xs font-bold text-primary uppercase tracking-wider">IA Ativa</p>
                      <p className="font-body-md text-sm font-bold text-on-surface">&quot;Lead qualificado via WhatsApp. Sugestão: Enviar PDF do Edifício Flora agora.&quot;</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios Section */}
        <section className="py-24 px-4 md:px-10 bg-surface-bright relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="font-display-lg text-4xl md:text-5xl font-extrabold text-primary">Tudo que você precisa para dominar o mercado em uma única plataforma.</h2>
              <div className="w-24 h-1 bg-primary-fixed mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* WhatsApp Item */}
              <div className="glass-panel p-8 rounded-3xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-outline-variant/20">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl">chat</span>
                </div>
                <h3 className="font-headline-md text-2xl font-bold text-primary mb-4">WhatsApp Integrado</h3>
                <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                  Diga adeus à bagunça. Todos os seus leads do WhatsApp caem diretamente no seu funil de vendas com organização total.
                </p>
              </div>
              {/* AI Item */}
              <div className="glass-panel p-8 rounded-3xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-outline-variant/20 ring-2 ring-primary/5">
                <div className="w-14 h-14 bg-primary-container/20 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                </div>
                <h3 className="font-headline-md text-2xl font-bold text-primary mb-4">Inteligência Artificial</h3>
                <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                  Deixe a IA resumir longos áudios e reescrever suas mensagens para soarem extremamente persuasivas e profissionais.
                </p>
              </div>
              {/* PDF Item */}
              <div className="glass-panel p-8 rounded-3xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-outline-variant/20">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl">picture_as_pdf</span>
                </div>
                <h3 className="font-headline-md text-2xl font-bold text-primary mb-4">PDFs Mágicos</h3>
                <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                  Crie apresentações em PDF de imóveis de alto padrão em 1 clique, prontas para enviar ao cliente impressionado.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Planos Section */}
        <section className="py-24 px-4 md:px-10 bg-white" id="planos">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display-lg text-4xl md:text-5xl font-extrabold text-primary mb-4">Invista na sua carreira e multiplique suas vendas.</h2>
              <p className="text-on-surface-variant font-body-lg text-lg">Planos flexíveis para corretores autônomos e imobiliárias de elite.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
              {/* Plano Básico */}
              <div className="glass-panel p-10 rounded-[32px] border border-outline-variant/30 flex flex-col h-full hover:shadow-lg transition-shadow">
                <div className="mb-8">
                  <h3 className="font-headline-md text-2xl font-bold text-secondary mb-2">Plano Básico</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-4xl font-extrabold text-primary">R$ 97</span>
                    <span className="font-body-md text-sm text-on-surface-variant">/mês</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm">Até 150 leads/mês</span>
                  </li>
                  <li className="flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm">CRM em Kanban completo</span>
                  </li>
                  <li className="flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm">Integração de 1 WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm">Resumo de Leads (IA Básica)</span>
                  </li>
                </ul>
                <Link href="/login?plan=BASIC" className="w-full block text-center py-4 rounded-2xl border-2 border-primary text-primary font-bold text-lg hover:bg-primary hover:text-on-primary transition-all active:scale-95">
                  Testar 3 dias Grátis
                </Link>
              </div>

              {/* Plano Premium */}
              <div className="glass-panel p-10 rounded-[32px] border-2 border-primary relative flex flex-col h-full shadow-2xl hover:-translate-y-1 transition-all">
                <div className="absolute -top-4 right-8 bg-primary text-on-primary px-4 py-1.5 rounded-full font-label-xs text-xs font-bold uppercase tracking-widest shadow-lg">
                  ⭐ MAIS ESCOLHIDO
                </div>
                <div className="mb-8">
                  <h3 className="font-headline-md text-2xl font-bold text-primary mb-2">Plano Premium</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-4xl font-extrabold text-primary">R$ 197</span>
                    <span className="font-body-md text-sm text-on-surface-variant">/mês</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm font-bold">Leads Ilimitados</span>
                  </li>
                  <li className="flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm font-bold">Até 2 WhatsApps Simultâneos</span>
                  </li>
                  <li className="flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm font-bold">Magic Write (IA de persuasão)</span>
                  </li>
                  <li className="flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm font-bold">Geração de PDFs Mágicos</span>
                  </li>
                  <li className="flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-sm font-bold">Controle Financeiro Avançado</span>
                  </li>
                </ul>
                <Link href="/login?plan=PREMIUM" className="w-full block text-center py-4 rounded-2xl bg-primary text-on-primary font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:bg-primary-container transition-all active:scale-95">
                  Testar 3 dias Grátis
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-24 px-4 md:px-10 bg-primary text-on-primary text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="font-display-lg text-4xl md:text-5xl font-extrabold">Pronto para elevar o nível das suas vendas?</h2>
            <p className="font-body-lg text-lg opacity-90">Junte-se a mais de 5.000 corretores que já automatizaram seu sucesso com Brokercloud.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/login?tab=register" className="bg-primary-fixed text-on-primary-fixed px-10 py-5 rounded-xl font-bold text-lg active:scale-95 transition-all">Começar Teste Grátis Agora</Link>
              <button className="border border-white/30 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white/10 active:scale-95 transition-all">Falar com Consultor</button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/30 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 md:px-10 py-12 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <img src="/logo1.png" alt="Brokercloud Logo" className="h-10 w-auto object-contain" />
              <span className="font-display-lg text-2xl font-extrabold text-primary">Brokercloud</span>
            </div>
            <p className="font-body-md text-sm text-on-surface-variant max-w-sm">
              A plataforma inteligente que redefine como corretores de alta performance gerenciam seus clientes e fecham negócios milionários.
            </p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all" href="#">
                <span className="material-symbols-outlined text-xl">share</span>
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-label-sm text-xs font-bold text-primary uppercase tracking-widest">Produto</h4>
              <ul className="space-y-2">
                <li><a className="font-body-md text-sm text-on-secondary-container hover:text-primary transition-colors" href="#">Privacidade</a></li>
                <li><a className="font-body-md text-sm text-on-secondary-container hover:text-primary transition-colors" href="#">Termos de Uso</a></li>
                <li><a className="font-body-md text-sm text-on-secondary-container hover:text-primary transition-colors" href="#">Suporte</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-label-sm text-xs font-bold text-primary uppercase tracking-widest">Empresa</h4>
              <ul className="space-y-2">
                <li><a className="font-body-md text-sm text-on-secondary-container hover:text-primary transition-colors" href="#">Blog</a></li>
                <li><a className="font-body-md text-sm text-on-secondary-container hover:text-primary transition-colors" href="#">Vendas</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="px-4 md:px-10 py-6 border-t border-outline-variant/10 max-w-7xl mx-auto text-center md:text-left">
          <p className="font-body-md text-sm text-on-surface-variant">
            © {new Date().getFullYear()} Brokercloud CRM. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </>
  );
}
