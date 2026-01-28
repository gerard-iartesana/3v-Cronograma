
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Rocket, ShieldCheck, Zap } from 'lucide-react';

export const LoginView: React.FC = () => {
    const { login } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 overflow-hidden relative">
            <div className="relative z-10 w-full max-w-sm p-6">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo-full.jpg"
                            alt="3Villas Logo"
                            className="h-16 w-auto object-contain"
                        />
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Cronograma</h1>
                        <div className="h-1 w-10 bg-[#dc0014] mx-auto rounded-full" />
                    </div>

                    <div className="flex flex-col items-center gap-2 mb-10">
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                            <ShieldCheck size={14} className="text-[#dc0014]" />
                            <span>Acceso seguro corporativo</span>
                        </div>
                    </div>

                    <button
                        onClick={() => login()}
                        className="w-full bg-[#dc0014] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-red-900/20 group"
                    >
                        <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                        <span className="text-base tracking-tight">Iniciar sesión</span>
                    </button>

                    <div className="mt-12 text-center">
                        <p className="text-gray-400 text-[10px] font-medium leading-loose">
                            @2026 iARTESANA.<br />
                            Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
