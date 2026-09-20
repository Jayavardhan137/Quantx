import React, { useState, useEffect } from 'react';
import PlotlyChart from '../components/PlotlyChart';
import { fetchCorrelation } from '../services/api';
import { Network, CheckCircle2 } from 'lucide-react';

export default function CorrelationView({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPair, setSelectedPair] = useState('Bitcoin vs NVIDIA');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchCorrelation(startDate, endDate)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="quant-spinner" />
        <span>Computing Return-Based Correlation Matrix...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
        Error loading correlation: {error}
      </div>
    );
  }

  if (!data) return null;

  const symbols = data.symbols || data.assets || ['Gold', 'Bitcoin', 'NVIDIA'];

  // Normalize 2D matrix
  let matrix2D = data.correlation_matrix;
  if (!Array.isArray(matrix2D) && data.correlation_matrix_dict) {
    matrix2D = symbols.map((r) => symbols.map((c) => data.correlation_matrix_dict[r]?.[c] ?? 0));
  } else if (!Array.isArray(matrix2D)) {
    matrix2D = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }

  // Correlation Heatmap Trace
  const heatmapTrace = {
    z: matrix2D,
    x: symbols,
    y: symbols,
    type: 'heatmap',
    colorscale: [
      [0.0, '#3b82f6'],
      [0.5, '#0f172a'],
      [1.0, '#10b981'],
    ],
    zmin: -1,
    zmax: 1,
    text: matrix2D.map((row) =>
      Array.isArray(row) ? row.map((v) => (typeof v === 'number' ? v.toFixed(3) : String(v))) : []
    ),
    texttemplate: '%{text}',
    textfont: { family: 'JetBrains Mono', color: '#ffffff', size: 14 },
    colorbar: {
      title: 'Pearson ρ',
      tickfont: { color: '#94a3b8', family: 'JetBrains Mono' },
    },
  };

  // Extract rolling correlation for selected pair
  let pairDates = [];
  let pairValues = [];

  if (data.rolling_correlations && data.rolling_correlations[selectedPair]) {
    const pts = data.rolling_correlations[selectedPair];
    pairDates = pts.map((p) => p.date);
    pairValues = pts.map((p) => p.value);
  } else if (data.rolling_correlation_dates && data.rolling_correlation_values) {
    pairDates = data.rolling_correlation_dates;
    pairValues = data.rolling_correlation_values;
  }

  const rollingTrace = {
    x: pairDates,
    y: pairValues,
    type: 'scatter',
    mode: 'lines',
    name: `60-Day Rolling Correlation (${selectedPair})`,
    line: { color: '#00f2fe', width: 2 },
  };

  const availablePairs = data.rolling_correlations
    ? Object.keys(data.rolling_correlations)
    : ['Bitcoin vs NVIDIA', 'NVIDIA vs Gold', 'Bitcoin vs Gold'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Institutional Requirement Note */}
      <div
        style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#bae6fd',
          fontSize: '0.88rem',
        }}
      >
        <CheckCircle2 size={20} color="var(--accent-cyan)" />
        <span>
          <strong>Methodological Requirement:</strong> Correlation is strictly computed on{' '}
          <strong>daily returns</strong> ($r_t = P_t/P_{'{t-1}'}-1$). Raw price correlation is rejected due
          to non-stationarity and spurious co-trending.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Heatmap Card */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <Network size={20} color="var(--accent-cyan)" />
              <span>Return Correlation Matrix</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Full 5-Year Window
            </span>
          </div>
          <PlotlyChart
            data={[heatmapTrace]}
            layout={{
              height: 380,
              margin: { t: 20, r: 20, l: 60, b: 60 },
            }}
          />
        </div>

        {/* Rolling Correlation Card */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <Network size={20} color="var(--accent-indigo)" />
              <span>Rolling 60-Day Correlation</span>
            </div>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
            >
              {availablePairs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <PlotlyChart
            data={[rollingTrace]}
            layout={{
              yaxis: { title: 'Rolling Correlation (ρ)', range: [-1, 1], side: 'right' },
              height: 380,
            }}
          />
        </div>
      </div>
    </div>
  );
}
