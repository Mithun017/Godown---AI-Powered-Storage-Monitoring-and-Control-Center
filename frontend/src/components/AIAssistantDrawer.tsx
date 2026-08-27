import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatResponse } from '../types';
import { apiClient } from '../api/client';
import { 
  Bot, X, Send, Sparkles, Database, RotateCcw, 
  ChevronDown, ChevronUp, Cpu, Clock
} from 'lucide-react';

export const AIAssistantDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '👋 Hello! I am your TN Warehouses AI Operational Assistant. Ask me any question about live IoT sensor telemetry, zone fire risks, temperature alerts, or capacity forecasts across all 10 central godowns.',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [warehouseId, setWarehouseId] = useState<number>(1);
  const [zoneId, setZoneId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [lastContext, setLastContext] = useState<any>(null);
  const [lastMeta, setLastMeta] = useState<{ latency: number; model: string } | null>(null);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    if (!textToSend) {
      setInputMessage('');
    }

    const newHistory = [...messages, { role: 'user', content: text }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const res = await apiClient.post<ChatResponse>('/api/assistant/chat', {
        message: text,
        warehouse_id: warehouseId,
        zone_id: zoneId,
        conversation_history: newHistory,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
      setLastContext(res.data.grounded_context);
      setLastMeta({ latency: res.data.latency_ms, model: res.data.model_used });
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Sorry, I encountered an issue fetching live warehouse telemetry. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Check Warehouse 1 Zone 1 risks",
    "What is the current state-wide occupancy?",
    "Show me fire & smoke alerts",
    "Predict capacity for 2027"
  ];

  return (
    <>
      {/* Floating Action Button (FAB) in Bottom Right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 p-3.5 md:p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer group ${
          isOpen
            ? 'bg-rose-600 hover:bg-rose-500 text-white rotate-90 shadow-rose-600/30'
            : 'bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white shadow-cyan-500/40 hover:scale-105'
        }`}
        title={isOpen ? "Close AI Assistant" : "Open AI Operational Assistant"}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="relative">
            <Bot size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </button>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 left-3 md:left-auto md:right-6 md:bottom-24 md:w-[420px] h-[540px] max-h-[80vh] z-50 glass-panel flex flex-col justify-between shadow-2xl rounded-3xl border border-cyan-500/30 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-cyan-600/20 via-sky-600/15 to-transparent border-b border-gray-500/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-500 shadow-inner">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-strong flex items-center gap-1.5">
                  <span>AI Operational Assistant</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-500 font-mono">Groq LLaMA 3.3</span>
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Grounded IoT Query Center</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([{ role: 'assistant', content: 'Chat reset. How can I help you with TN Warehouses today?' }])}
                className="p-1.5 rounded-xl hover:bg-gray-500/15 text-gray-400 transition-colors"
                title="Reset Conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-500/15 text-gray-400 transition-colors"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Target Telemetry Selector Bar */}
          <div className="px-3.5 py-2 bg-gray-500/5 border-b border-gray-500/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Database size={13} className="text-cyan-500" />
              <span className="font-semibold text-gray-500 text-[11px]">Context:</span>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(Number(e.target.value))}
                className="px-1.5 py-0.5 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 font-bold text-strong text-[10px] outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => (
                  <option key={id} value={id}>Godown #{id}</option>
                ))}
              </select>

              <select
                value={zoneId}
                onChange={(e) => setZoneId(Number(e.target.value))}
                className="px-1.5 py-0.5 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 font-bold text-strong text-[10px] outline-none"
              >
                {[1, 2, 3, 4].map((z) => (
                  <option key={z} value={z}>Zone #{z}</option>
                ))}
              </select>
            </div>

            {lastContext && (
              <button
                onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
                className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-0.5"
              >
                <span>Telemetry</span>
                {showTelemetryDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>

          {/* Injected Telemetry Dropdown Details */}
          {showTelemetryDetails && lastContext && (
            <div className="px-3.5 py-2 bg-cyan-500/10 border-b border-cyan-500/20 text-[10px] font-mono grid grid-cols-2 gap-x-3 gap-y-0.5">
              <div><span className="text-gray-400">Temp:</span> <span className="text-amber-400 font-bold">{lastContext.temperature_C}°C</span></div>
              <div><span className="text-gray-400">Humidity:</span> <span className="text-sky-400 font-bold">{lastContext.humidity_pct}%</span></div>
              <div><span className="text-gray-400">Smoke:</span> <span className="text-orange-400 font-bold">{lastContext.smoke_ppm} PPM</span></div>
              <div><span className="text-gray-400">Occupancy:</span> <span className="text-cyan-400 font-bold">{lastContext.occupancy_pct}%</span></div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-br-none shadow-md shadow-cyan-600/20'
                        : 'bg-gray-500/10 text-strong border border-gray-500/15 rounded-bl-none'
                    }`}
                  >
                    {!isUser && (
                      <span className="text-[10px] font-bold text-cyan-500 mb-1 flex items-center gap-1">
                        <Sparkles size={11} />
                        <span>AI Assistant</span>
                      </span>
                    )}
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="p-2.5 rounded-2xl bg-gray-500/10 border border-gray-500/15 text-[11px] text-gray-500 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span>Fetching live telemetry & reasoning with Groq...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Suggested Quick Prompt Chips */}
          <div className="px-3.5 py-1.5 border-t border-gray-500/10 bg-gray-500/5 overflow-x-auto flex gap-1.5 scrollbar-none">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(qp)}
                disabled={isLoading}
                className="px-2 py-0.5 rounded-full bg-gray-500/10 hover:bg-cyan-500/20 hover:border-cyan-500/30 border border-gray-500/10 text-[10px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap transition-colors cursor-pointer"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Footer Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-2.5 bg-gray-500/5 border-t border-gray-500/15 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about TN warehouses..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none focus:border-cyan-500 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-md shadow-cyan-600/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>

          {/* Latency Footer Bar */}
          {lastMeta && (
            <div className="px-3 py-1 bg-slate-950/80 text-[9px] text-gray-400 flex items-center justify-between font-mono border-t border-white/5">
              <span className="flex items-center gap-1"><Cpu size={10} /> {lastMeta.model}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {lastMeta.latency} ms</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};
