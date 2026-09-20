import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeBackground Component
 * Renders an animated 3D WebGL particle wave and dynamic grid
 * that smoothly reacts to cursor movement.
 */
export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.set(0, 350, 600);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'default' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    currentMount.appendChild(renderer.domElement);

    // Particles Grid Geometry (Optimized 40x40 for ultra-high FPS)
    const SEPARATION = 55;
    const AMOUNTX = 40;
    const AMOUNTY = 40;
    const numParticles = AMOUNTX * AMOUNTY;

    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);
    const colors = new Float32Array(numParticles * 3);

    const color1 = new THREE.Color('#00f2fe'); // Neon cyan
    const color2 = new THREE.Color('#6366f1'); // Electric indigo
    const color3 = new THREE.Color('#38bdf8'); // Sky blue

    let i = 0;
    let j = 0;

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2; // x
        positions[i + 1] = 0; // y
        positions[i + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2; // z

        scales[j] = 1.8;

        // Color gradient across the grid
        const lerpFactor = (ix / AMOUNTX + iy / AMOUNTY) / 2;
        const vertexColor = color1.clone().lerp(color2, lerpFactor);
        colors[i] = vertexColor.r;
        colors[i + 1] = vertexColor.g;
        colors[i + 2] = vertexColor.b;

        i += 3;
        j++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom shader material for glowing round points
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float scale;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = scale * (350.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Subtle ambient lighting & floating glowing polyhedrons
    const polyGeo = new THREE.IcosahedronGeometry(120, 1);
    const polyMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const polyMesh = new THREE.Mesh(polyGeo, polyMat);
    polyMesh.position.set(250, 100, -200);
    scene.add(polyMesh);

    const polyGeo2 = new THREE.TorusGeometry(160, 2, 16, 100);
    const polyMat2 = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const torusMesh = new THREE.Mesh(polyGeo2, polyMat2);
    torusMesh.rotation.x = Math.PI / 3;
    torusMesh.position.set(-300, 80, -300);
    scene.add(torusMesh);

    // Mouse tracking for parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onPointerMove = (event) => {
      mouseX = (event.clientX - windowHalfX) * 0.3;
      mouseY = (event.clientY - windowHalfY) * 0.3;
    };

    window.addEventListener('pointermove', onPointerMove);

    // Resize Handler
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onWindowResize);

    // Animation Loop
    let count = 0;
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera interpolation
      targetX += (mouseX - targetX) * 0.03;
      targetY += (mouseY - targetY) * 0.03;

      camera.position.x = targetX;
      camera.position.y = 350 - targetY;
      camera.lookAt(0, 0, 0);

      // Wave calculation
      const positionAttr = geometry.attributes.position;
      const posArray = positionAttr.array;
      let pIndex = 0;

      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          posArray[pIndex + 1] =
            Math.sin((ix + count) * 0.3) * 35 +
            Math.sin((iy + count) * 0.5) * 35;
          pIndex += 3;
        }
      }

      positionAttr.needsUpdate = true;

      // Rotate geometric meshes
      polyMesh.rotation.x += 0.003;
      polyMesh.rotation.y += 0.004;

      torusMesh.rotation.z += 0.002;
      torusMesh.rotation.y += 0.003;

      count += 0.035;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onWindowResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      polyGeo.dispose();
      polyMat.dispose();
      polyGeo2.dispose();
      polyMat2.dispose();
      renderer.dispose();
    };
  }, []);

  return <div id="three-bg-canvas" ref={mountRef} />;
}
