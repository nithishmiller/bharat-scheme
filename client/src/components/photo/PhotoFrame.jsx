import { useEffect, useRef, useState } from 'react';
import './photo.css';

/**
 * PhotoFrame component for Bharat Scheme.
 * Displays real photographs of Indian citizens in designed frames with
 * text inside them (scrim gradient), Ken Burns zoom, IntersectionObserver reveal,
 * hover lift, and gentle parallax. Respects prefers-reduced-motion and works at 360px.
 *
 * @param {string} image - Path or URL to the photo
 * @param {string} alt - Accessible description
 * @param {string} title - Overlay headline
 * @param {string} text - Sub-headline or caption text
 * @param {'hero' | 'card' | 'strip' | 'polaroid'} [variant='card'] - Display variant
 * @param {string} [className] - Additional CSS classes
 * @param {React.ReactNode} [badge] - Optional badge or tag displayed on top
 * @param {React.ReactNode} [children] - Optional slot for action buttons or links
 */
export default function PhotoFrame({
  image,
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

  // 2. Gentle mouse-move parallax (disabled if prefers-reduced-motion)
  const handleMouseMove = (e) => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = frameRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setOffset({ x: x * 6, y: y * 6 });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  // Standard dimensions by variant to prevent layout shift
  const dims = {
    hero: { width: 1200, height: 500, ratio: '21/9' },
    card: { width: 800, height: 600, ratio: '4/3' },
    strip: { width: 1200, height: 280, ratio: '16/5' },
    polaroid: { width: 600, height: 750, ratio: '4/5' },
  }[variant] || { width: 800, height: 600, ratio: '4/3' };

  return (
    <div
      ref={frameRef}
      className={`photo-frame pf-${variant} ${isVisible ? 'is-visible' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      <div className="pf-media-wrapper">
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
        <div className="pf-scrim" aria-hidden="true" />
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
