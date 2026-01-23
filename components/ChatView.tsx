
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2, RotateCcw, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useApp } from '../context/AppContext';
import { processChatMessage } from '../services/gemini';
import { GlassHeader } from './GlassHeader';

const VIBRANT_LILAC = '#B066FF';

export const ChatView: React.FC = () => {
  const { chatHistory, addChatMessage, applyStateUpdate, clearChat, events, projects, budget } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now()
    };

    // Guardar el mensaje del usuario inmediatamente
    addChatMessage(userMsg);

    const historyForAI = chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content }));
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const result = await processChatMessage(currentInput + " (IMPORTANTE: Los títulos de las actividades generadas deben ser muy concisos, máximo 3-4 palabras)", historyForAI, events, projects, budget);

      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || "Lo siento, no he podido procesar esa solicitud.",
        timestamp: Date.now()
      });

      if (result.newEvents || result.updatedEvents || result.deletedEvents || result.newProjects || result.updatedProjects || result.budgetUpdate) {
        applyStateUpdate(result);
      }
    } catch (error) {
      console.error("Chat Interaction Error:", error);
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Ha ocurrido un error técnico al conectar con la inteligencia artificial.",
        timestamp: Date.now()
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <div className="relative flex items-center justify-between">
        <GlassHeader title="¿Te ayudo?" underlineColor="#dc0014" />
        <button
          onClick={clearChat}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-[50] flex items-center justify-center bg-white border border-gray-200 w-10 h-10 rounded-full text-gray-400 hover:text-[#dc0014] transition-all shadow-sm"
          title="Reiniciar chat"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full space-y-4">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                  <MessageCircle className="text-[#dc0014]" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-700">Soy tu Asistente de 3villas</h3>
                <p className="text-gray-500 text-sm mt-2">Prueba una de estas frases para ver de qué es capaz la IA de 3V</p>
              </div>

              {[
                "Planifica una campaña de marketing de 2 semanas para el lanzamiento de un nuevo producto con 5 actividades clave.",
                "Crea un proyecto estructurado para organizar un taller de diseño, incluyendo tareas y presupuesto estimado.",
                "Dime qué actividades tengo pendientes para esta semana y ayúdame a optimizar los costes."
              ].map((phrase, i) => (
                <button
                  key={i}
                  className="w-full bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 p-4 rounded-2xl text-center transition-all group shadow-sm"
                  onClick={() => {
                    setInput(phrase);
                    setTimeout(() => {
                      const btn = document.getElementById('chat-send-button');
                      btn?.click();
                    }, 100);
                  }}
                >
                  <p className="text-sm text-gray-600 group-hover:text-black leading-relaxed text-center">{phrase}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-3 md:p-5 text-sm md:text-base leading-relaxed shadow-sm
                ${msg.role === 'user'
                  ? 'bg-[#dc0014] text-white rounded-br-none'
                  : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'}`}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-[#dc0014]">{children}</strong>
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-2 shadow-sm">
              <Loader2 className="animate-spin text-[#dc0014]" size={16} />
              <span className="text-gray-500 text-xs font-semibold tracking-widest">Analizando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-8 pt-0">
        <div className="relative group max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe aquí..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-12 text-black text-sm md:text-base focus:outline-none focus:border-[#dc0014] transition-all placeholder:text-gray-400 shadow-sm"
          />
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
            <MessageSquare size={20} />
          </button>
          <button
            id="chat-send-button"
            onClick={handleSend}
            disabled={isTyping}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#dc0014] p-2 rounded-xl text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 hover:bg-red-700 shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
