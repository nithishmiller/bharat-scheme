import { useState, useEffect, useRef, useMemo } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import HeroScene, { FAMILY_NODES } from './HeroScene.jsx';

function checkWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function checkReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
}

export default function HeroVisual({ fallback }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [mode, setMode] = useState('3d'); // '3d' | 'card'
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(FAMILY_NODES[0]);

  // Initial environment detection
  useEffect(() => {
    const webglOk = checkWebGL();
    const motionPref = checkReducedMotion();
    setHasWebGL(webglOk);
    setPrefersReducedMotion(motionPref);

    if (!webglOk || motionPref) {
      setMode('card');
    }

    // Media query listener for reduced-motion changes
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setMode('card');
    };
    mediaQuery?.addEventListener?.('change', handleMotionChange);

    return () => {
      mediaQuery?.removeEventListener?.('change', handleMotionChange);
    };
  }, []);

  // IntersectionObserver to pause rendering when off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeDisplayNode = useMemo(() => {
    return hoveredNode || selectedNode || FAMILY_NODES[0];
  }, [hoveredNode, selectedNode]);

  // Should the 3D scene animation be paused?
  const isScenePaused = !isIntersecting || isManuallyPaused || mode !== '3d';

  // If WebGL is completely missing and user didn't switch, render fallback
  if (!hasWebGL) {
    return fallback || null;
  }

  // If user prefers reduced motion and mode is card, render fallback directly
  if (prefersReducedMotion && mode === 'card') {
    return fallback || null;
  }

  return (
    <figure
      ref={containerRef}
      className="hero-visual-card"
      aria-label={t('hero.visualAria')}
    >
      <figcaption className="hero-visual-bar">
        <div className="hv-title-wrap">
          <span className="hv-pulse-dot" aria-hidden="true" />
          <span className="hv-title">
            {mode === '3d' ? t('hero.constellationTitle') : t('hero.sampleMapTitle')}
          </span>
          <span className="tag hv-tag">
            {mode === '3d' ? t('hero.interactive3d') : t('hero.staticView')}
          </span>
        </div>

        <div className="hv-controls">
          {mode === '3d' && (
            <button
              type="button"
              className="hv-btn-icon"
              onClick={() => setIsManuallyPaused((p) => !p)}
              title={isManuallyPaused ? t('hero.resumeAnim') : t('hero.pauseAnim')}
              aria-label={isManuallyPaused ? t('hero.resume3dAria') : t('hero.pause3dAria')}
            >
              {isManuallyPaused ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              )}
            </button>
          )}

          <div className="seg hv-seg" role="tablist" aria-label={t('hero.modeAria')}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === '3d'}
              aria-pressed={mode === '3d'}
              onClick={() => setMode('3d')}
            >
              {t('hero.mode3d')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'card'}
              aria-pressed={mode === 'card'}
              onClick={() => setMode('card')}
            >
              {t('hero.modeCard')}
            </button>
          </div>
        </div>
      </figcaption>

      <div className="hero-visual-body">
        {mode === 'card' ? (
          fallback
        ) : (
          <div className="hv-3d-stage">
            <HeroScene
              isPaused={isScenePaused}
              activeNodeId={activeDisplayNode?.id}
              onNodeHover={setHoveredNode}
              onNodeSelect={setSelectedNode}
            />

            {/* Floating Editorial Beneficiary Detail Box */}
            <div className="hv-overlay-card">
              <div className="hv-node-badge" style={{ backgroundColor: activeDisplayNode?.hex }}>
                {activeDisplayNode?.initials || (activeDisplayNode?.nameKey ? t(activeDisplayNode.nameKey) : '').slice(0, 2).toUpperCase()}
              </div>
              <div className="hv-node-info">
                <div className="hv-node-row">
                  <b className="hv-node-name">{activeDisplayNode?.nameKey ? t(activeDisplayNode.nameKey) : ''}</b>
                  <span className="chip eligible small">{t('status.eligible')}</span>
                </div>
                <span className="hv-node-role">{activeDisplayNode?.roleKey ? t(activeDisplayNode.roleKey) : ''}</span>
                <div className="hv-node-scheme">
                  <span className="hv-scheme-label">{activeDisplayNode?.schemeKey ? t(activeDisplayNode.schemeKey) : ''}</span>
                  <span className="amt cash num small">{activeDisplayNode?.benefitKey ? t(activeDisplayNode.benefitKey) : ''}</span>
                </div>
              </div>
            </div>

            {/* Quick Helper Hint */}
            <div className="hv-hint">
              <span>{t('hero.hint')}</span>
            </div>

            {/* Bottom Family Member Nodes Selector Bar */}
            <nav className="hv-nodes-nav" aria-label={t('hero.nodesNavAria')}>
              {FAMILY_NODES.map((node) => {
                const isSelected = activeDisplayNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`hv-node-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      '--node-color': node.hex,
                    }}
                  >
                    <span className="hv-pill-dot" style={{ backgroundColor: node.hex }} />
                    <span className="hv-pill-role">{node.pillKey ? t(node.pillKey) : ''}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </figure>
  );
}
