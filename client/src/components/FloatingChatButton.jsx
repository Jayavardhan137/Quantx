import React from 'react';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';

export default function FloatingChatButton({ onClick, isOpen }) {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="floating-chat-trigger"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999,
        background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #8b5cf6 100%)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '999px',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        color: '#ffffff',
        cursor: 'pointer',
        boxShadow: '0 8px 30px rgba(14, 165, 233, 0.45), 0 0 20px rgba(139, 92, 246, 0.3)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.88rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(14, 165, 233, 0.6), 0 0 30px rgba(139, 92, 246, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(14, 165, 233, 0.45), 0 0 20px rgba(139, 92, 246, 0.3)';
      }}
      title="Ask QuantX AI (Featherless) to explain anything simply"
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Bot size={20} />
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 6px #10b981',
          }}
        />
      </div>
      <span>Ask QuantX AI</span>
      <Sparkles size={14} style={{ opacity: 0.8 }} />
    </button>
  );
}
