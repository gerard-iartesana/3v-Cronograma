
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Rocket, ShieldCheck, Zap } from 'lucide-react';

export const LoginView: React.FC = () => {
    const { login } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden relative">
            <div className="relative z-10 w-full max-w-sm p-6">
                <div className="bg-neutral-900 rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-800">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/bsc_logo.png"
                            alt="BSC Logo"
                            className="h-20 w-auto object-contain"
                        />
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Cronograma</h1>
                        <div className="h-1 w-10 bg-[#dc0014] mx-auto rounded-full" />
                    </div>

                    <div className="flex flex-col items-center gap-2 mb-10">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                            <ShieldCheck size={14} className="text-[#dc0014]" />
                            <span>Acceso seguro corporativo</span>
                        </div>
                    </div>

                    <button
                        onClick={() => login()}
                        className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#dc0014] hover:text-white transition-all active:scale-[0.98] shadow-lg shadow-white/10 group"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        <span className="text-base tracking-tight">Continuar con Google</span>
                    </button>

                    <div className="mt-12 text-center">
                        <p className="text-gray-500 text-[10px] font-medium leading-loose">
                            @2026 iARTESANA.<br />
                            Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
