
import React from 'react';
import { MessageSquare, LayoutGrid, Compass, User, Briefcase, Settings, HelpCircle, X, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppSection } from '../types';

const LOGO_URL = '/logo-3v.png';

const getSectionColor = (section: AppSection) => {
  return '#dc0014'; // All sections use the brand red
};

const getGlowClass = (section: AppSection) => {
  return 'glow-brand'; // Unified glow for everything
};

const SidebarIcon: React.FC<{ icon: React.ElementType, active: boolean, color: string, glowClass: string, onClick: () => void }> = ({ icon: Icon, active, color, glowClass, onClick }) => (
  <div className="relative flex items-center group cursor-pointer h-14 w-full" onClick={onClick}>
    <div className="flex items-center justify-center w-full">
      <Icon
        size={24}
        className={`transition-all duration-300 ${active ? glowClass : ''} ${!active ? 'group-hover:text-black/60' : ''}`}
        style={{ color: active ? '#dc0014' : '#9ca3af' }}
        strokeWidth={active ? 2.5 : 2}
      />
    </div>
    <div
      className="absolute right-0 h-8 w-[3px] rounded-l-full transition-all duration-500"
      style={{
        backgroundColor: active ? '#dc0014' : 'transparent',
        opacity: active ? 1 : 0,
        transform: active ? 'scaleY(1)' : 'scaleY(0.5)'
      }}
    />
  </div>
);

const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white border border-gray-200 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-8 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-gray-700 text-3xl font-bold tracking-tighter">Guía de Uso</h2>
          <p className="text-gray-500 text-[10px] font-bold">Domina el Hub de 3V</p>
        </div>
        <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-black transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[#dc0014]">
            <MessageSquare size={20} />
            <h3 className="font-bold text-xs">Chat con IA</h3>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Interacciona con la IA para crear proyectos, actividades o modificar cualquier dato. Puedes pedir cosas como <span className="text-black font-bold italic">"Crea un proyecto de Redes Sociales para Febrero"</span> o <span className="text-black font-bold italic">"Cambia el coste de la actividad X a 200€"</span>.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[#dc0014]">
            <LayoutGrid size={20} />
            <h3 className="font-bold text-xs">Calendario Estratégico</h3>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Visualiza tu cronograma en 5 modos: día, semana (con opción L-V), mes, año (trimestral) y agenda. Puedes arrastrar y soltar actividades para reprogramarlas cómodamente.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[#dc0014]">
            <Briefcase size={20} />
            <h3 className="font-bold text-xs">Gestión de Proyectos</h3>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Organiza tus trabajos en tres columnas: <span className="text-black font-bold uppercase text-[10px]">Plantillas</span>, <span className="text-black font-bold uppercase text-[10px]">En curso</span> y <span className="text-black font-bold uppercase text-[10px]">Terminados</span>. Usa la ordenación dinámica para priorizar por deadline o progreso.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-black">
            <TrendingUp size={20} />
            <h3 className="font-bold text-xs">Rendimiento Financiero</h3>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Analiza la rentabilidad comparando el <span className="text-black font-bold">Valor Estimado</span> frente al <span className="text-black font-bold">Coste Real</span>. Gestiona tus gastos fijos anuales y ajusta tu tarifa horaria para ver el impacto en tiempo real.
          </p>
        </section>
      </div>

      <div className="p-8 bg-gray-50 border-t border-gray-100">
        <button onClick={onClose} className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
          Entendido
        </button>
      </div>
    </div>
  </div>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentSection, setCurrentSection } = useApp();
  const [showHelp, setShowHelp] = React.useState(false);

  const sections: { id: AppSection, icon: any }[] = [
    { id: 'chat', icon: MessageSquare },
    { id: 'calendar', icon: LayoutGrid },
    { id: 'projects', icon: Briefcase },
    { id: 'profile', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-20 border-r border-gray-200 items-center py-8 bg-white z-50 shadow-md">
        <img src={LOGO_URL} alt="Hub Logo" className="w-12 h-auto mb-12 opacity-90 hover:opacity-100 transition-opacity object-contain" />
        <nav className="flex flex-col w-full gap-4 flex-1">
          {sections.map(s => (
            <SidebarIcon
              key={s.id}
              icon={s.icon}
              active={currentSection === s.id}
              color={getSectionColor(s.id)}
              glowClass={getGlowClass(s.id)}
              onClick={() => setCurrentSection(s.id)}
            />
          ))}
        </nav>
        <div className="w-full mt-auto mb-4 px-2 opacity-60 hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowHelp(true)}
            className="w-full aspect-square flex items-center justify-center rounded-2xl hover:bg-black/5 text-gray-400 hover:text-black transition-all"
          >
            <HelpCircle size={24} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50">
        {/* Mobile Header / Nav */}
        <header className="md:hidden sticky top-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-200 h-14 flex items-center shadow-sm">
          <div className="flex w-full h-full">
            {sections.map(s => {
              const Icon = s.icon;
              const color = getSectionColor(s.id);
              const active = currentSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentSection(s.id)}
                  className="relative flex-1 flex flex-col items-center justify-center transition-all duration-300"
                  style={{ color: active ? color : '#9ca3af' }}
                >
                  <Icon size={20} className={active ? getGlowClass(s.id) : ''} />
                  {active && (
                    <div
                      className="absolute bottom-0 w-8 h-[3px] rounded-t-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-smooth">
          {children}
        </main>

        {/* Help Button Mobile */}
        <button
          onClick={() => setShowHelp(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-white backdrop-blur-xl border border-gray-200 rounded-full flex items-center justify-center text-black shadow-2xl z-[150] hover:scale-110 active:scale-95 transition-all"
        >
          <HelpCircle size={28} />
        </button>

        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    </div>
  );
};
