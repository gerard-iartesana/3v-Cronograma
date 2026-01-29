
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RotateCcw, Plus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useApp } from '../context/AppContext';
import { processChatMessage } from '../services/gemini';
import { GlassHeader } from './GlassHeader';

export const ChatView: React.FC = () => {
  const { chatHistory, addChatMessage, applyStateUpdate, clearChat, events, projects, budget, knowledgeBase, addDocument } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [tempFiles, setTempFiles] = useState<{ name: string, content: string, data?: string, mimeType?: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const base64Data = await fileToBase64(file);
          const name = `Pasted Image ${new Date().toLocaleTimeString()}`;
          setTempFiles(prev => [...prev, { name, content: `[Imagen Pegada]`, data: base64Data, mimeType: file.type }]);
        }
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const content = re.target?.result as string;
        setTempFiles(prev => [...prev, { name: file.name, content }]);
        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `He cargado **${file.name}** temporalmente.`,
          timestamp: Date.now()
        });
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      try {
        const base64Data = await fileToBase64(file);
        setTempFiles(prev => [...prev, { name: file.name, content: `[Archivo ${file.type}]`, data: base64Data, mimeType: file.type }]);
        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `He recibido **${file.name}**. Ya puedo analizar su contenido.`,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("Error converting file:", err);
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && tempFiles.length === 0) || isTyping) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
      attachments: tempFiles.filter(f => f.data).map(f => ({ name: f.name, data: f.data!, mimeType: f.mimeType! }))
    };

    addChatMessage(userMsg);

    const historyForAI = chatHistory.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments
    }));
    const currentInput = input;
    const currentTempFiles = [...tempFiles];

    setInput('');
    setTempFiles([]);
    setIsTyping(true);

    try {
      const result = await processChatMessage(
        currentInput + " (IMPORTANTE: Los títulos de las actividades generadas deben ser muy concisos, máximo 3-4 palabras)",
        historyForAI,
        events,
        projects,
        budget,
        knowledgeBase,
        currentTempFiles
      );

      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || "Lo siento, no he podido procesar esa solicitud.",
        timestamp: Date.now()
      });

      if (result.newEvents || result.updatedEvents || result.deletedEvents || result.newProjects || result.updatedProjects || result.budgetUpdate || result.knowledgeBaseUpdate) {
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

  const onClearChat = () => {
    clearChat();
    setTempFiles([]);
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      <div className="relative">
        <GlassHeader title="¿Te ayudo?" underlineColor="#FFD000" />
        <button
          onClick={onClearChat}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-[110] flex items-center justify-center bg-neutral-900 border border-neutral-800 w-10 h-10 rounded-full text-gray-400 hover:text-[#FFD000] transition-all"
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
                <h3 className="text-xl font-bold text-gray-200">Asistente de BSC para la gestión cronograma</h3>
                <p className="text-gray-500 text-sm mt-2">Prueba una de estas frases para ver de qué es capaz la IA de BSC</p>
              </div>

              {[
                "Planifica una campaña de marketing de 2 semanas para el lanzamiento de un nuevo producto con 5 actividades clave.",
                "Crea un proyecto estructurado para organizar un taller de diseño, incluyendo tareas y presupuesto estimado.",
                "Dime qué actividades tengo pendientes para esta semana y ayúdame a optimizar los costes."
              ].map((phrase, i) => (
                <button
                  key={i}
                  className="w-full bg-neutral-900 border border-neutral-800 hover:border-[#FFD000]/30 hover:bg-[#FFD000]/5 p-4 rounded-2xl text-center transition-all group shadow-sm"
                  onClick={() => {
                    setInput(phrase);
                    setTimeout(() => {
                      const btn = document.getElementById('chat-send-button');
                      btn?.click();
                    }, 100);
                  }}
                >
                  <p className="text-sm text-gray-400 group-hover:text-white leading-relaxed text-center">{phrase}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-3 md:p-5 text-sm md:text-base leading-relaxed shadow-sm
                ${msg.role === 'user'
                  ? 'bg-[#FFD000] text-black rounded-br-none'
                  : 'bg-neutral-900 border border-neutral-800 text-gray-300 rounded-bl-none'}`}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2 marker:text-[#FFD000]">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 marker:text-[#FFD000]">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-[#FFD000]">{children}</strong>
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.attachments.map((at, i) => (
                      at.mimeType.startsWith('image/') ? (
                        <img key={i} src={`data:${at.mimeType};base64,${at.data}`} className="max-w-full max-h-48 rounded-lg shadow-inner cursor-zoom-in" alt={at.name} />
                      ) : (
                        <div key={i} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/10 text-xs">
                          <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded uppercase font-bold text-[10px]">{at.name.split('.').pop()}</div>
                          <span className="truncate max-w-[150px]">{at.name}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex items-center gap-2 shadow-sm">
              <Loader2 className="animate-spin text-[#FFD000]" size={16} />
              <span className="text-gray-500 text-xs font-semibold tracking-widest">Analizando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-8 pt-0">
        <div className="relative group max-w-4xl mx-auto">
          {tempFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-neutral-900 border border-neutral-800 rounded-xl">
              {tempFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-lg text-xs text-gray-300 border border-neutral-700">
                  {file.mimeType?.startsWith('image/') ? (
                    <img src={`data:${file.mimeType};base64,${file.data}`} className="w-6 h-6 object-cover rounded" />
                  ) : (
                    <div className="w-6 h-6 flex items-center justify-center bg-neutral-700 rounded text-[8px] uppercase">{file.name.split('.').pop()}</div>
                  )}
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button onClick={() => setTempFiles(prev => prev.filter((_, i) => i !== idx))} className="text-gray-500 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.txt,.md,.jpg,.png,.jpeg"
            onChange={handleFileUpload}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            onPaste={handlePaste}
            placeholder="Escribe aquí..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 px-12 text-white text-sm md:text-base focus:outline-none focus:border-[#FFD000] transition-all placeholder:text-neutral-500 shadow-sm"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FFD000] transition-colors"
          >
            <Plus size={20} />
          </button>
          <button
            id="chat-send-button"
            onClick={handleSend}
            disabled={isTyping}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#FFD000] p-2 rounded-xl text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 hover:bg-yellow-500 shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

    </div>
  );
};
