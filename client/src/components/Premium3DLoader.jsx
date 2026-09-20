import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Cpu, ShieldCheck, Database, Zap, Sparkles } from 'lucide-react';

/**
 * Premium 3D Animated Quantum Loading Screen
 * Renders an interactive 3D WebGL core with rotating particle rings,
 * holographic grid, and institutional telemetry boot sequence.
 */
export default function Premium3DLoader({ onLoadingComplete, minDuration = 2400 }) {
  const mountRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const steps = [
    { text: 'Initializing Next-Bar (t → t+1) Execution Engine...', icon: Cpu },
    { text: 'Connecting to Alpaca Markets REST Data Feeds (NVDA, BTC/USD, GLD)...', icon: Database },
    { text: 'Validating Parquet Caching & Zero Look-Ahead Invariants...', icon: ShieldCheck },
    { text: 'Calibrating 500-Path Monte Carlo Bootstrap Kernel...', icon: Sparkles },
    { text: 'QuantX Institutional Research Terminal Online.', icon: Zap },
  ];

  // Progress and step progression timer
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / minDuration) * 100));
      setProgress(pct);

      const stepIdx = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
      setCurrentStepIdx(stepIdx);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onLoadingComplete) onLoadingComplete();
          }, 600);
        }, 300);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [minDuration, onLoadingComplete]);

  // Three.js 3D Quantum Core Scene
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 240;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'default' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    currentMount.appendChild(renderer.domElement);

    // 1. Central Icosahedron Wireframe
    const coreGeo = new THREE.IcosahedronGeometry(45, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 2. Inner Solid Glowing Core
    const innerGeo = new THREE.OctahedronGeometry(22, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: false,
      transparent: true,
      opacity: 0.65,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerMesh);

    // 3. Dual Spinning Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(70, 0.8, 8, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 3;
    scene.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(85, 0.8, 8, 48);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.65,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.y = Math.PI / 4;
    scene.add(ringMesh2);

    // 4. Particle Vortex Clouds
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color('#00f2fe');
    const color2 = new THREE.Color('#8b5cf6');

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 95 + Math.random() * 35;

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const mixedColor = color1.clone().lerp(color2, Math.random());
      particleColors[i * 3] = mixedColor.r;
      particleColors[i * 3 + 1] = mixedColor.g;
      particleColors[i * 3 + 2] = mixedColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotate central core
      coreMesh.rotation.x = elapsed * 0.45;
      coreMesh.rotation.y = elapsed * 0.65;

      innerMesh.rotation.x = -elapsed * 0.8;
      innerMesh.rotation.z = elapsed * 0.5;

      // Rotate orbital rings
      ringMesh1.rotation.z = elapsed * 0.5;
      ringMesh1.rotation.y = elapsed * 0.35;

      ringMesh2.rotation.x = elapsed * 0.4;
      ringMesh2.rotation.z = -elapsed * 0.6;

      // Rotate particle swarm
      particles.rotation.y = elapsed * 0.15;
      particles.rotation.x = Math.sin(elapsed * 0.2) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  const CurrentIcon = steps[currentStepIdx].icon;

  return (
    <div className={`quantum-loader-overlay ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="quantum-loader-content">
        {/* Brand Banner */}
        <div className="quantum-loader-brand">
          <div className="quantum-logo-glow">QX</div>
          <div className="quantum-title-wrap">
            <div className="quantum-brand-title">QuantX</div>
            <div className="quantum-brand-subtitle">INSTITUTIONAL QUANTITATIVE TERMINAL</div>
          </div>
        </div>

        {/* 3D WebGL Canvas Mount */}
        <div ref={mountRef} className="quantum-3d-canvas-box" />

        {/* Progress Display */}
        <div className="quantum-progress-section">
          <div className="quantum-progress-info">
            <div className="quantum-step-indicator">
              <CurrentIcon size={16} className="quantum-step-icon" />
              <span>{steps[currentStepIdx].text}</span>
            </div>
            <div className="quantum-percent">{progress}%</div>
          </div>

          <div className="quantum-progress-bar-track">
            <div
              className="quantum-progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
            <div
              className="quantum-progress-glow-head"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        {/* Telemetry Console Readout */}
        <div className="quantum-telemetry-panel">
          <div className="telemetry-header">
            <span className="telemetry-dot" />
            <span>BOOT TELEMETRY KERNEL v3.2</span>
          </div>
          <div className="telemetry-log-lines">
            {steps.slice(0, currentStepIdx + 1).map((s, idx) => (
              <div key={idx} className="telemetry-line">
                <span className="telemetry-timestamp">
                  {`[00:0${idx + 1}.${(idx * 23 + 12).toString().padStart(2, '0')}]`}
                </span>
                <span className="telemetry-success">✓</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
