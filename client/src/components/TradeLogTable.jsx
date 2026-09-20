import React, { useState } from 'react';
import { Download, FileText, ArrowRight } from 'lucide-react';

export default function TradeLogTable({ tradeLog = [], symbol = 'NVDA' }) {
  const [filterType, setFilterType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredLogs = tradeLog.filter((trade) => {
    if (filterType === 'ALL') return true;
    return trade.type === filterType || trade.signal === filterType;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedTrades = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    if (!tradeLog.length) return;
    const headers = Object.keys(tradeLog[0]).join(',');
    const rows = tradeLog.map((r) => Object.values(r).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantX_TradeLog_${symbol}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card">
      <div className="glass-card-header">
        <div className="glass-card-title">
          <FileText size={20} color="var(--accent-cyan)" />
          <span>Execution Trade Log ({filteredLogs.length} Events)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Signals</option>
            <option value="BUY">BUY Orders Only</option>
            <option value="SELL">SELL Orders Only</option>
          </select>

          <button className="btn-secondary" onClick={exportCSV} disabled={!tradeLog.length}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {paginatedTrades.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No execution trades logged in this period.
        </div>
      ) : (
        <div className="table-container">
          <table className="quant-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Signal Date ($t$)</th>
                <th>Exec Date ($t+1$)</th>
                <th>Action</th>
                <th>Price (₹)</th>
                <th>Shares Traded</th>
                <th>Notional Traded</th>
                <th>Cash Remaining</th>
                <th>Trade Return</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.map((t, idx) => {
                const isBuy = (t.action || t.type || t.signal) === 'BUY';
                const pnl = t.pnl_pct ?? t.return_pct ?? null;
                return (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td>{t.signal_date || t.date || '—'}</td>
                    <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{t.execution_date || t.date || '—'}</td>
                    <td>
                      <span className={isBuy ? 'trade-buy' : 'trade-sell'}>
                        {isBuy ? '▲ BUY' : '▼ SELL'}
                      </span>
                    </td>
                    <td>₹{Number(t.price || t.execution_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{Number(t.shares || t.units || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td>₹{Number(t.notional || (t.price * t.shares) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td>₹{Number(t.cash ?? t.cash_remaining ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td>
                      {pnl !== null ? (
                        <span style={{ color: Number(pnl) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
                          {Number(pnl) >= 0 ? '+' : ''}{Number(pnl).toFixed(2)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Showing page {currentPage} of {totalPages}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
