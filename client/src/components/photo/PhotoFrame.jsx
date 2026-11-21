import { useEffect, useMemo, useRef, useState } from 'react';
import './photo.css';

/**
 * PhotoFrame component for Bharat Scheme.
 * Displays real photographs of Indian citizens in designed frames with
 * text inside them (scrim gradient), Ken Burns zoom, IntersectionObserver reveal,
 * hover lift, and physical interaction. Respects prefers-reduced-motion and works at 360px.
 *
 * Variants:
 *  - 'hero': Panoramic showcase with prominent typography
 *  - 'card': Grid card with high readability
 *  - 'strip': Horizontal header banner for page headers & categories
 *  - 'polaroid': Tactile paper photograph frame with tilt
 *  - 'tilt': Interactive 3D perspective tilt with specular shine reflection
 *  - 'duotone': Editorial saffron & green duo-tone color treatment
 *  - 'circle': Round avatar or badge with double-ring border
 *  - 'mosaic': Multi-photo collage grid (3-5 photos)
 *
 * @param {string} [image] - Path or URL to the photo
 * @param {Array<string|{image: string, alt?: string}>} [images] - Multiple photos for mosaic variant
 * @param {string} [alt=''] - Accessible description
 * @param {string} [title] - Overlay headline
 * @param {string} [text] - Sub-headline or caption text
 * @param {'hero' | 'card' | 'strip' | 'polaroid' | 'tilt' | 'duotone' | 'circle' | 'mosaic'} [variant='card'] - Display variant
 * @param {string} [className] - Additional CSS classes
 * @param {React.ReactNode} [badge] - Optional badge or tag displayed on top
 * @param {React.ReactNode} [children] - Optional slot for action buttons or links
 */
export default function PhotoFrame({
  image,
  images,
  alt = '',
  title,
  text,
  variant = 'card',
  className = '',
  badge,
  children,
  ...rest
}) {
  const frameRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, active: false });

  // 1. Reveal on scroll via IntersectionObserver
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 2. Gentle mouse-move parallax & 3D tilt (disabled if prefers-reduced-motion)
  const handleMouseMove = (e) => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = frameRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    if (variant === 'tilt') {
      setTilt({ rx: -y * 14, ry: x * 14 });
      setGlare({ x: (x + 0.5) * 100, y: (y + 0.5) * 100, active: true });
    } else {
      setOffset({ x: x * 6, y: y * 6 });
    }
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
    setTilt({ rx: 0, ry: 0 });
    setGlare({ x: 50, y: 50, active: false });
  };

  // Standard dimensions by variant to prevent layout shift
  const dims = {
    hero: { width: 1200, height: 500, ratio: '21/9' },
    card: { width: 800, height: 600, ratio: '4/3' },
    strip: { width: 1200, height: 280, ratio: '16/5' },
    polaroid: { width: 600, height: 750, ratio: '4/5' },
    tilt: { width: 800, height: 600, ratio: '4/3' },
    duotone: { width: 800, height: 600, ratio: '4/3' },
    circle: { width: 360, height: 360, ratio: '1/1' },
    mosaic: { width: 1200, height: 500, ratio: '16/9' },
  }[variant] || { width: 800, height: 600, ratio: '4/3' };

  // Normalise mosaic images array
  const mosaicList = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      return images.map((it) => (typeof it === 'string' ? { image: it, alt: '' } : it));
    }
    if (image) return [{ image, alt }];
    return [];
  }, [images, image, alt]);

  const dynamicTiltStyle =
    variant === 'tilt' && isVisible
      ? {
          transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }
      : undefined;

  return (
    <div
      ref={frameRef}
      className={`photo-frame pf-${variant} ${isVisible ? 'is-visible' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={dynamicTiltStyle}
      {...rest}
    >
      <div className="pf-media-wrapper">
        {variant === 'mosaic' ? (
          <div className="pf-mosaic-grid">
            {mosaicList.map((mItem, idx) => (
              <div key={idx} className={`pf-mosaic-cell pf-mosaic-cell-${idx}`}>
                <img
                  src={mItem.image}
                  alt={mItem.alt || alt || `Bharat Scheme mosaic photo ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="pf-img"
                />
              </div>
            ))}
          </div>
        ) : (
          <img
            src={image}
            alt={alt || title || 'Bharat Scheme photograph'}
            loading="lazy"
            decoding="async"
            width={dims.width}
            height={dims.height}
            className="pf-img"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
            }}
          />
        )}

        <div className="pf-scrim" aria-hidden="true" />

        {variant === 'duotone' && <div className="pf-duotone-glow" aria-hidden="true" />}

        {variant === 'tilt' && (
          <div
            className="pf-glare"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.08) 40%, transparent 70%)`,
              opacity: glare.active ? 1 : 0,
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {badge && <div className="pf-badge">{badge}</div>}

      {(title || text || children) && (
        <div className="pf-content">
          {title && <h3 className="pf-title">{title}</h3>}
          {text && <p className="pf-text">{text}</p>}
          {children && <div className="pf-actions">{children}</div>}
        </div>
      )}
    </div>
  );
}
