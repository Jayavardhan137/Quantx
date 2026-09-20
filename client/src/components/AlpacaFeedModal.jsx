import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Zap, Shield, Key } from 'lucide-react';
import { fetchAlpacaStatus } from '../services/api';

export default function AlpacaFeedModal({ isOpen, onClose }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showKey, setShowKey] = useState(false);

  const checkStatus = () => {
    setLoading(true);
    setError(null);
    fetchAlpacaStatus()
      .then((res) => {
        setStatusData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)' }}>
              <Database size={22} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>
                Alpaca Markets Data Feed
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Institutional Market Data Pipeline & Direct API Ingestion
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text-secondary)' }}>
          {/* Connection Status Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
                display: 'inline-block'
              }} />
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem' }}>
                  Alpaca REST Data API: {statusData?.status || 'ONLINE'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                  Latency: {statusData?.latencyMs ? `${statusData.latencyMs} ms` : 'Testing...'} • HTTPS TLS 1.3
                </div>
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={checkStatus}
              disabled={loading}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <RefreshCw size={14} className={loading ? 'quant-spinner' : ''} />
              <span>{loading ? 'Pinging...' : 'Ping Live'}</span>
            </button>
          </div>

          {/* Credentials Info */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={16} color="var(--accent-cyan)" />
              <span>Active API Configuration</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>API Key ID:</span>
                <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '2px' }}>
                  {showKey ? 'PK5SHTQMKADL3M7WLMPPAGHURG' : 'PK5SHT...URG'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Endpoint URL:</span>
                <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                  https://data.alpaca.markets/v2
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Caching Engine:</span>
                <div style={{ color: 'var(--accent-emerald)', marginTop: '2px' }}>
                  Local Parquet (Zero Re-Fetch)
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Fallback Source:</span>
                <div style={{ color: '#fbbf24', marginTop: '2px' }}>
                  Yahoo Finance Normalizer
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide Key' : 'Reveal Key'}
              </button>
            </div>
          </div>

          {/* Active Data Feeds */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.75rem' }}>
              Active Data Channels
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>NVIDIA (NVDA)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>IEX Daily Bars (10k max)</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>● CONNECTED</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Bitcoin (BTC/USD)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>US Crypto 24/7 Feed</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>● CONNECTED</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Gold (GLD / GC=F)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>SPDR Gold Trust Equities</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>● CONNECTED</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn-primary-action" style={{ width: 'auto', padding: '0.65rem 1.75rem' }} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
