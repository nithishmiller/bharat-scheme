import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Family member nodes in Bharat Scheme brand colors
export const FAMILY_NODES = [
  {
    id: 'farmer',
    name: 'M. Ramanathan',
    nameKey: 'hero.farmerName',
    roleKey: 'hero.farmerRole',
    pillKey: 'hero.farmer',
    schemeKey: 'hero.farmerScheme',
    benefitKey: 'hero.farmerBenefit',
    initials: 'MR',
    status: 'eligible',
    color: 0x0E7A4C, // Civic green
    hex: '#0E7A4C',
    pos: [2.5, 0.7, 1.1],
  },
  {
    id: 'homemaker',
    name: 'K. Lakshmi',
    nameKey: 'hero.homemakerName',
    roleKey: 'hero.homemakerRole',
    pillKey: 'hero.homemaker',
    schemeKey: 'hero.homemakerScheme',
    benefitKey: 'hero.homemakerBenefit',
    initials: 'KL',
    status: 'eligible',
    color: 0xE9A21B, // Marigold
    hex: '#E9A21B',
    pos: [-2.3, 1.2, -0.9],
  },
  {
    id: 'student',
    name: 'R. Karthik',
    nameKey: 'hero.studentName',
    roleKey: 'hero.studentRole',
    pillKey: 'hero.student',
    schemeKey: 'hero.studentScheme',
    benefitKey: 'hero.studentBenefit',
    initials: 'RK',
    status: 'eligible',
    color: 0x2F5F8A, // Slate blue
    hex: '#2F5F8A',
    pos: [1.7, -1.4, 1.6],
  },
  {
    id: 'elder',
    name: 'S. Meenakshi',
    nameKey: 'hero.seniorCitizenName',
    roleKey: 'hero.seniorCitizenRole',
    pillKey: 'hero.seniorCitizen',
    schemeKey: 'hero.seniorCitizenScheme',
    benefitKey: 'hero.seniorCitizenBenefit',
    initials: 'SM',
    status: 'eligible',
    color: 0x8F5500, // Amber
    hex: '#8F5500',
    pos: [-1.9, -1.1, 1.4],
  },
];

// Generate radial soft glow particle texture using canvas
function createParticleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default function HeroScene({
  isPaused = false,
  activeNodeId = null,
  onNodeHover = () => {},
  onNodeSelect = () => {},
}) {
  const containerRef = useRef(null);
  const activeNodeIdRef = useRef(activeNodeId);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    activeNodeIdRef.current = activeNodeId;
  }, [activeNodeId]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 420;

    // Renderer setup with high performance & safe pixel ratio
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 7.2);

    // Main rotating group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7e6, 1.4);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const coreLight = new THREE.PointLight(0xe9a21b, 2.2, 10);
    coreLight.position.set(0, 0, 0);
    worldGroup.add(coreLight);

    // Texture for glowing points
    const particleTexture = createParticleTexture();

    // 1. Central Core: Bharat Scheme Welfare Hub
    const coreGeo = new THREE.SphereGeometry(0.72, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10233f,
      roughness: 0.35,
      metalness: 0.6,
      emissive: 0x0a1626,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    worldGroup.add(coreMesh);

    // Core Wireframe / Chakra Ring
    const coreWireGeo = new THREE.IcosahedronGeometry(0.82, 2);
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: 0xe9a21b,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreWireMesh = new THREE.Mesh(coreWireGeo, coreWireMat);
    worldGroup.add(coreWireMesh);

    // 2. Orbital Rings (representing Central, State, and District tiers)
    const ringGroup = new THREE.Group();
    worldGroup.add(ringGroup);

    const ringDefs = [
      { radius: 2.1, rotX: Math.PI / 3, rotY: 0.2, color: 0x1e7b4f, opacity: 0.35 },
      { radius: 2.7, rotX: -Math.PI / 4, rotY: 0.6, color: 0xe9a21b, opacity: 0.4 },
      { radius: 3.2, rotX: Math.PI / 6, rotY: -0.4, color: 0x2f5f8a, opacity: 0.3 },
    ];

    ringDefs.forEach(({ radius, rotX, rotY, color, opacity }) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.015, radius + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = rotX;
      ringMesh.rotation.y = rotY;
      ringGroup.add(ringMesh);
    });

    // 3. Spherical Particle Cloud (Community / Population Nodes)
    const particleCount = 480;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0x0e7a4c), // green
      new THREE.Color(0xe9a21b), // marigold
      new THREE.Color(0xb7791f), // amber
      new THREE.Color(0x2f5f8a), // blue
      new THREE.Color(0x10233f), // navy
      new THREE.Color(0x9aa5b3), // subtle muted
    ];

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.4 + Math.random() * 0.9;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      const col = palette[Math.floor(Math.random() * palette.length)];
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }

    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const cloudMat = new THREE.PointsMaterial({
      size: 0.12,
      map: particleTexture,
      transparent: true,
      opacity: 0.75,
      vertexColors: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const cloudPoints = new THREE.Points(cloudGeo, cloudMat);
    worldGroup.add(cloudPoints);

    // 4. Family Member Interactive Nodes & Connection Splines
    const nodeMeshes = [];
    const splineData = [];
    const pulseSpheres = [];

    FAMILY_NODES.forEach((node) => {
      // Node Group
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(...node.pos);
      nodeGroup.userData = { id: node.id, nodeData: node };

      // Core sphere of the node
      const nGeo = new THREE.SphereGeometry(0.24, 24, 24);
      const nMat = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.4,
      });
      const nMesh = new THREE.Mesh(nGeo, nMat);
      nMesh.userData = { id: node.id, nodeData: node };
      nodeGroup.add(nMesh);

      // Outer Halo Ring
      const haloGeo = new THREE.RingGeometry(0.32, 0.36, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      nodeGroup.add(haloMesh);

      worldGroup.add(nodeGroup);
      nodeMeshes.push(nMesh);

      // Curve linking Center (0,0,0) to Node position
      const p0 = new THREE.Vector3(0, 0, 0);
      const p3 = new THREE.Vector3(...node.pos);
      // Mid-point curvature
      const mid = p3.clone().multiplyScalar(0.5);
      mid.y += 0.4;
      mid.x += (Math.random() - 0.5) * 0.4;

      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p3);
      const points = curve.getPoints(36);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
      const curveMat = new THREE.LineBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.45,
        linewidth: 1,
      });
      const lineMesh = new THREE.Line(curveGeo, curveMat);
      worldGroup.add(lineMesh);

      // Traveling signal pulses along this curve (scheme benefits arriving)
      for (let p = 0; p < 2; p++) {
        const pulseGeo = new THREE.SphereGeometry(0.065, 12, 12);
        const pulseMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9,
        });
        const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
        worldGroup.add(pulseMesh);
        pulseSpheres.push({
          mesh: pulseMesh,
          curve,
          offset: p * 0.5 + Math.random() * 0.2,
          speed: 0.18,
        });
      }

      splineData.push({ curve, haloMesh, nMesh, nodeGroup });
    });

    // Raycaster for interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredNode = null;

    // Mouse & Touch interaction state
    let targetRotY = 0;
    let targetRotX = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
      if (clientX === undefined || clientY === undefined) return;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = clientX - prevMouseX;
        const deltaY = clientY - prevMouseY;
        targetRotY += deltaX * 0.008;
        targetRotX += deltaY * 0.005;
        prevMouseX = clientX;
        prevMouseY = clientY;
      } else {
        // Subtle tilt with mouse movement
        targetRotY = mouse.x * 0.45;
        targetRotX = -mouse.y * 0.25;
      }
    };

    const onPointerDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX ?? (e.touches && e.touches[0].clientX);
      prevMouseY = e.clientY ?? (e.touches && e.touches[0].clientY);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onClick = () => {
      if (hoveredNode) {
        onNodeSelect(hoveredNode.userData.nodeData);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousemove', onPointerMove);
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('click', onClick);

    domEl.addEventListener('touchmove', onPointerMove, { passive: true });
    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || !entries[0]) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    // Animation loop
    let animId = null;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isPausedRef.current) return;

      const elapsed = clock.getElapsedTime();

      // Smooth damped rotation
      worldGroup.rotation.y += (targetRotY - worldGroup.rotation.y) * 0.05 + 0.002;
      worldGroup.rotation.x += (targetRotX - worldGroup.rotation.x) * 0.05;

      // Slow counter-rotation of rings and wireframe
      coreWireMesh.rotation.y = elapsed * 0.15;
      coreWireMesh.rotation.x = elapsed * 0.08;
      ringGroup.rotation.z = elapsed * 0.04;
      cloudPoints.rotation.y = -elapsed * 0.03;

      // Update traveling benefit pulses
      pulseSpheres.forEach(({ mesh, curve, offset, speed }) => {
        const t = (elapsed * speed + offset) % 1.0;
        const pt = curve.getPoint(t);
        mesh.position.copy(pt);
        const scale = 0.5 + Math.sin(t * Math.PI) * 0.9;
        mesh.scale.set(scale, scale, scale);
      });

      // Update halo rings so they always face the camera
      splineData.forEach(({ haloMesh, nMesh, nodeGroup }) => {
        haloMesh.lookAt(camera.position);
        // Subtle floating breathing motion
        const floatOffset = Math.sin(elapsed * 1.5 + nodeGroup.position.x) * 0.04;
        nMesh.position.y = floatOffset;
        haloMesh.position.y = floatOffset;

        // Check if highlighted via external activeNodeId
        const isCurrentActive = activeNodeIdRef.current === nodeGroup.userData.id;
        if (isCurrentActive) {
          haloMesh.scale.set(1.4, 1.4, 1.4);
          nMesh.scale.set(1.2, 1.2, 1.2);
        } else if (hoveredNode !== nMesh) {
          haloMesh.scale.set(1, 1, 1);
          nMesh.scale.set(1, 1, 1);
        }
      });

      // Raycast for hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hoveredNode !== hit) {
          hoveredNode = hit;
          domEl.style.cursor = 'pointer';
          hit.scale.set(1.3, 1.3, 1.3);
          onNodeHover(hit.userData.nodeData);
        }
      } else {
        if (hoveredNode) {
          if (activeNodeIdRef.current !== hoveredNode.userData.id) {
            hoveredNode.scale.set(1, 1, 1);
          }
          hoveredNode = null;
          domEl.style.cursor = isDragging ? 'grabbing' : 'grab';
          onNodeHover(null);
        }
      }

      renderer.render(scene, camera);
    };

    domEl.style.cursor = 'grab';
    animate();

    // Cleanup on unmount
    return () => {
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();

      domEl.removeEventListener('mousemove', onPointerMove);
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('click', onClick);
      domEl.removeEventListener('touchmove', onPointerMove);
      domEl.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchend', onPointerUp);

      // Dispose Geometries and Materials
      coreGeo.dispose();
      coreMat.dispose();
      coreWireGeo.dispose();
      coreWireMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      particleTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="hero-3d-canvas-wrap"
      style={{ width: '100%', height: '100%', minHeight: 380, position: 'relative' }}
      aria-hidden="true"
    />
  );
}
