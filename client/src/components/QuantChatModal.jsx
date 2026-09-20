import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
  Zap,
  CheckCircle2,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { sendChatMessage } from '../services/api';

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: 'Explain Sharpe Ratio simply', prompt: 'Explain what the Sharpe Ratio is in simple terms with an everyday analogy and how to interpret values like 0.5, 1.0, and 2.0.' },
  { icon: ShieldCheck, label: 'Next-Bar Execution & Bias', prompt: 'Why is Next-Bar Execution (t -> t+1) critical in quantitative backtesting, and how does QuantX eliminate lookahead bias?' },
  { icon: Zap, label: 'Explain Current Strategy', prompt: 'Explain the currently selected strategy in simple terms: how its buy/sell rules work and what market conditions it thrives or suffers in.' },
  { icon: Activity, label: 'Market Regimes (4 States)', prompt: 'Explain the 4-State Market Regime matrix (Bull/Bear Trend × High/Low Volatility) and why strategies perform differently in each.' },
  { icon: Layers, label: 'Monte Carlo Robustness', prompt: 'Explain what the 500-Path Monte Carlo bootstrap simulation tells us about a trading strategy and why testing against overfitting matters.' },
  { icon: HelpCircle, label: 'Inverse Volatility / Risk Parity', prompt: 'How does Inverse Volatility weighting work in multi-asset portfolios compared to Equal Weighting (1/N)?' },
];

export default function QuantChatModal({ isOpen, onClose, terminalContext = {} }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 **Welcome to QuantX AI Assistant!**\n\nI am your quantitative research co-pilot powered by **Featherless AI**. I can explain trading strategies, mathematical metrics, execution mechanics, portfolio allocation, and market regimes in plain English.\n\nAsk me anything or click a quick prompt below to get started!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Format messages history for OpenAI chat format (role + content)
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await sendChatMessage(apiMessages, terminalContext);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          model: res.model,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **AI Service Notice**: Unable to generate response (${err.message}). Please verify your network connection or try again.`,
          isError: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat history cleared. How can I assist your quantitative analysis today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '780px',
          height: '85vh',
          maxHeight: '750px',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          background: 'rgba(11, 15, 25, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.15)',
          borderRadius: '16px',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)',
              }}
            >
              <Bot size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  QuantX AI Assistant
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(0, 242, 254, 0.15)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  Featherless AI
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                <span>Mistral-7B-Instruct • Context: {terminalContext.symbol || 'NVDA'} ({terminalContext.strategy || 'SMA'})</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={clearChat}
              className="btn-secondary"
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Clear Conversation"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Topic Chips */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {QUICK_PROMPTS.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(qp.prompt)}
                disabled={loading}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '4px 11px',
                  color: '#cbd5e1',
                  fontSize: '0.73rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.color = 'var(--accent-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <Icon size={12} color="var(--accent-cyan)" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Stream */}
        <div
          style={{
            flex: 1,
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '100%',
                }}
              >
                <div
                  style={{
                    maxWidth: isUser ? '80%' : '90%',
                    padding: '0.85rem 1.15rem',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser
                      ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)'
                      : 'rgba(30, 41, 59, 0.65)',
                    border: isUser
                      ? '1px solid rgba(56, 189, 248, 0.4)'
                      : msg.isError
                      ? '1px solid rgba(244, 63, 94, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    color: msg.isError ? 'var(--accent-rose)' : '#f1f5f9',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                    wordBreak: 'break-word',
                  }}
                >
                  {/* Formatted message content */}
                  <div
                    style={{ whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(msg.content),
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    marginRight: isUser ? '6px' : '0',
                    marginLeft: !isUser ? '6px' : '0',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {msg.time} {msg.model && `• ${msg.model}`}
                </span>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={16} color="var(--accent-cyan)" />
              </div>
              <div
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '14px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--accent-cyan)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div className="quant-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span>Generating simple quantitative explanation with Featherless AI...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.8)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about Sharpe, Drawdown, SMA, Market Regimes, or Portfolio Math..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.88rem',
              borderRadius: '10px',
              background: 'rgba(11, 15, 25, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#ffffff',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="btn-primary-action"
            style={{
              width: 'auto',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: loading || !input.trim() ? 0.6 : 1,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Basic safe Markdown to HTML formatter for bold, code blocks, lists, and headers
 */
function formatMarkdown(text = '') {
  if (!text) return '';
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h4 style="color:var(--accent-cyan); margin:0.6rem 0 0.3rem 0; font-size:0.95rem; font-weight:700;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="color:#ffffff; margin:0.8rem 0 0.4rem 0; font-size:1.05rem; font-weight:800;">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 style="color:#ffffff; margin:1rem 0 0.5rem 0; font-size:1.15rem; font-weight:800;">$1</h2>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:var(--accent-cyan); font-weight:700;">$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/gim, '<code style="background:rgba(0,0,0,0.4); color:#38bdf8; padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-size:0.82rem;">$1</code>')
    // Bullet points
    .replace(/^\* (.*$)/gim, '<li style="margin-left:1.2rem; list-style-type:disc;">$1</li>')
    .replace(/^- (.*$)/gim, '<li style="margin-left:1.2rem; list-style-type:disc;">$1</li>');
}
