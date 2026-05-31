import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginView() {
  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    const header = document.getElementById('landing-header');
    if (!header) return;
    const handler = () => {
      if (window.scrollY > 20) {
        header.classList.add('shadow-sm');
      } else {
        header.classList.remove('shadow-sm');
      }
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="bg-background text-on-surface overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Nav */}
      <header id="landing-header" className="fixed top-0 w-full z-50 glass-panel border-b border-outline-variant/20 transition-all duration-300">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>stacked_bar_chart</span>
            </div>
            <span className="text-2xl font-bold text-primary tracking-tight">DataForm</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold tracking-wide text-on-surface-variant hover:text-primary transition-colors" href="#caracteristicas">Características</a>
            <a className="text-sm font-semibold tracking-wide text-on-surface-variant hover:text-primary transition-colors" href="#soluciones">Soluciones</a>
            <a className="text-sm font-semibold tracking-wide text-on-surface-variant hover:text-primary transition-colors" href="#precios">Precios</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={signInWithGoogle} className="hidden md:block px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Iniciar sesión
            </button>
            <button onClick={signInWithGoogle} className="bg-primary hover:bg-surface-tint text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95">
              Comenzar gratis
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-fixed rounded-full blur-[120px] opacity-30 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="max-w-[1280px] mx-auto px-4 md:px-10 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Text */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full w-fit mb-4">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Investigación Premium</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-on-surface leading-tight tracking-tight mb-2">
                Decisiones brillantes basadas en{' '}
                <span className="text-primary relative inline-block">
                  datos reales
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-secondary-fixed opacity-70" preserveAspectRatio="none" viewBox="0 0 100 10">
                    <path d="M0 5 Q 50 10 100 5" fill="transparent" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>.
              </h1>
              <p className="text-lg text-on-surface-variant max-w-[500px] mb-6 leading-relaxed">
                La plataforma de encuestas diseñada para equipos de alto rendimiento. Obtén respuestas rápidas, análisis profundos y flujos de trabajo sin fricción.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <button
                  onClick={signInWithGoogle}
                  className="w-full sm:w-auto bg-primary hover:bg-surface-tint text-white px-8 py-4 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 8px 16px rgba(31,16,142,0.2)' }}
                >
                  Crear mi primera encuesta
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <a
                  href="#caracteristicas"
                  className="w-full sm:w-auto bg-white hover:bg-surface-container-low text-primary border border-outline-variant/30 px-8 py-4 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  Ver características
                </a>
              </div>
              <div className="mt-8 flex items-center gap-4 text-on-surface-variant text-sm">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-surface-variant border-2 border-white" />
                </div>
                <p>Únete a más de <strong className="text-on-surface">10,000</strong> investigadores.</p>
              </div>
            </div>

            {/* Visual */}
            <div className="lg:col-span-6 relative mt-12 lg:mt-0">
              <div className="relative w-full aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/10 ambient-shadow flex items-center justify-center group">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBDGrCrnxu_1D3wmtuPZsczxOzCxjIm73M_W1L2b8v7lbWwHFGMT5wdQ5BIZ_b2piWYwJsUJwrM8s26-TLeM9B9VZ62nu2EHseBneBoZPuvfRLE_Pj3AYs6uYrSurU1usduOMwHNIINznPSEWCCeq7cDU23cFZtHjyy6WEiQAPF_8gRxWUpxYLS6qk2mS1jW0trL53fUuTOi6vdR-sJ8wmQ4aR05z_M6Iv4GADoVG-XYItRl9HBbQ9RPpW_VXaGKxZT-VOW8535ghLO')" }}
                />
                {/* Floating card 1 */}
                <div className="absolute top-8 right-8 glass-panel rounded-xl p-4 w-48 shadow-lg" style={{ animation: 'fade-in-up 0.8s ease-out 0.2s both' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-secondary-fixed-variant text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">+24%</p>
                      <p className="text-[10px] text-on-surface-variant">Tasa de respuesta</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-secondary rounded-full" />
                  </div>
                </div>
                {/* Floating card 2 */}
                <div className="absolute bottom-12 left-8 glass-panel rounded-xl p-5 w-64 shadow-lg" style={{ animation: 'fade-in-up 0.8s ease-out 0.5s both' }}>
                  <p className="text-sm font-semibold text-on-surface mb-1">Satisfacción del Cliente</p>
                  <p className="text-4xl font-bold text-primary leading-tight">8.9<span className="text-on-surface-variant text-base font-normal">/10</span></p>
                  <div className="flex gap-1 mt-2">
                    {[20, 40, 60, 80, 100].map(op => (
                      <div key={op} className="h-8 flex-1 bg-primary rounded-md" style={{ opacity: op / 100 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-surface" id="caracteristicas">
          <div className="max-w-[1280px] mx-auto px-4 md:px-10">
            <div className="text-center max-w-[600px] mx-auto mb-16">
              <h2 className="text-3xl font-bold text-on-surface mb-4">Todo lo que necesitas para entender a tu audiencia.</h2>
              <p className="text-base text-on-surface-variant">
                Olvídate de las herramientas complejas. DataForm unifica el diseño intuitivo con analíticas potentes para que te enfoques en los resultados.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridAutoRows: 'minmax(280px, auto)' }}>

              {/* Feature 1 — large */}
              <div className="md:col-span-2 bg-white rounded-2xl p-8 border border-outline-variant/20 ambient-shadow hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="relative z-10 md:w-3/5">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-on-primary-fixed-variant text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-on-surface mb-3">Análisis inteligente automático</h3>
                  <p className="text-base text-on-surface-variant mb-6">
                    Convierte datos crudos en gráficos dinámicos por tipo de pregunta, exporta en PDF o CSV y comparte resultados listos para presentar.
                  </p>
                  <button onClick={signInWithGoogle} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-surface-tint transition-colors">
                    Explorar analíticas <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-tl from-primary-fixed-dim/20 to-transparent translate-x-10 translate-y-10 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-500 rounded-tl-[100px]" />
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl p-8 border border-outline-variant/20 ambient-shadow hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-on-tertiary-fixed text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>edit_square</span>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-3">Creación sin esfuerzo</h3>
                <p className="text-base text-on-surface-variant">
                  Constructor visual con múltiples tipos de pregunta: opción múltiple, estrellas, NPS, deslizador, matriz, ranking y texto libre.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-2xl p-8 border border-outline-variant/20 ambient-shadow hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-on-surface text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-3">Comparte al instante</h3>
                <p className="text-base text-on-surface-variant">
                  Cada encuesta genera un enlace público y un código QR descargable. Comparte por WhatsApp, correo o imprímelo.
                </p>
              </div>

              {/* Feature 4 — large */}
              <div className="md:col-span-2 bg-white rounded-2xl p-8 border border-outline-variant/20 ambient-shadow hover:shadow-md transition-shadow flex items-center justify-between overflow-hidden">
                <div className="max-w-[400px]">
                  <h3 className="text-2xl font-semibold text-on-surface mb-3">100% fiel a tu marca</h3>
                  <p className="text-base text-on-surface-variant">
                    Personaliza colores, tipografías y añade tu logotipo para que cada encuesta se sienta como una extensión natural de tu producto.
                  </p>
                </div>
                <div className="hidden md:flex gap-4 opacity-80 pointer-events-none translate-x-8">
                  <div className="w-24 h-32 rounded-lg bg-primary-fixed shadow-sm" />
                  <div className="w-24 h-40 rounded-lg bg-secondary-fixed shadow-sm -translate-y-4" />
                  <div className="w-24 h-24 rounded-lg bg-surface-container-high shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary" id="precios">
          <div className="max-w-[1280px] mx-auto px-4 md:px-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Empieza a recopilar datos hoy.</h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">Sin tarjeta de crédito. Sin límites para empezar.</p>
            <button
              onClick={signInWithGoogle}
              className="bg-white text-primary px-10 py-4 rounded-xl text-sm font-semibold hover:bg-primary-fixed transition-all shadow-lg active:scale-95 inline-flex items-center gap-2"
            >
              <GoogleIcon />
              Crear cuenta con Google — es gratis
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-outline-variant/20 pt-20 pb-10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>stacked_bar_chart</span>
                </div>
                <span className="text-2xl font-bold text-primary tracking-tight">DataForm</span>
              </div>
              <p className="text-sm text-on-surface-variant max-w-[250px]">
                Empoderando a equipos con datos claros y herramientas de investigación premium.
              </p>
            </div>
            {[
              { title: 'Producto', links: ['Características', 'Plantillas', 'Integraciones', 'Precios'] },
              { title: 'Recursos', links: ['Centro de ayuda', 'Blog', 'Guías de investigación', 'Comunidad'] },
              { title: 'Empresa', links: ['Sobre nosotros', 'Contacto', 'Privacidad', 'Términos legales'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-sm font-bold text-on-surface mb-4 tracking-wide uppercase">{col.title}</h4>
                <ul className="flex flex-col gap-3">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-outline-variant/20 text-sm text-on-surface-variant">
            <p>© 2025 DataForm. Todos los derechos reservados.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[18px]">share</span>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[18px]">work</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
