'use client';

// Basado en ImageTrail de React Bits (https://reactbits.dev), convertido a TypeScript.
// Solo las opciones que usa el sitio, animado con la Web Animations API en lugar de GSAP.
// Escucha el mouse en toda la ventana: así puede ir detrás del contenido sin bloquear sus clics.

import { useEffect, useRef } from 'react';
import './ImageTrail.css';

type ImageTrailProps = {
  items: string[];
  /** Ancho de cada foto (px) */
  size?: number;
  /** Alto = ancho × aspectRatio */
  aspectRatio?: number;
  radius?: number;
  /** Distancia (px) que hay que mover el mouse para soltar otra foto */
  threshold?: number;
  /** Segundos que la foto queda visible antes de irse */
  lifetime?: number;
  /** Escala con la que se va */
  exitScale?: number;
  className?: string;
};

const MOVE_S = 0.4;
const EXIT_S = 0.4;

export default function ImageTrail({
  items,
  size = 190,
  aspectRatio = 1.1,
  radius = 15,
  threshold = 80,
  lifetime = 0.4,
  exitScale = 0.2,
  className = ''
}: ImageTrailProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !items.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const images = Array.from(container.querySelectorAll<HTMLElement>('[data-trail-image]'));
    const mouse = { x: 0, y: 0 };
    const last = { x: 0, y: 0 };
    // Posición suavizada: la foto nueva sale desde aquí y viaja hasta el mouse
    const cache = { x: 0, y: 0 };
    let started = false;
    let raf = 0;
    let index = -1;
    let zIndex = 1;

    const total = Math.max(MOVE_S, lifetime) + EXIT_S;

    const spawn = () => {
      index = (index + 1) % images.length;
      const el = images[index];
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      el.getAnimations().forEach(a => a.cancel());
      el.style.zIndex = String(++zIndex);
      const from = `translate(${cache.x - w / 2}px, ${cache.y - h / 2}px)`;
      const to = `translate(${mouse.x - w / 2}px, ${mouse.y - h / 2}px)`;
      el.animate(
        [
          { offset: 0, opacity: 1, transform: `${from} scale(1)`, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
          { offset: MOVE_S / total, opacity: 1, transform: `${to} scale(1)` },
          { offset: lifetime / total, opacity: 1, transform: `${to} scale(1)`, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' },
          { offset: 1, opacity: 0, transform: `${to} scale(${exitScale})` }
        ].sort((a, b) => a.offset - b.offset),
        { duration: total * 1000 }
      );
    };

    const loop = () => {
      raf = 0;
      cache.x += (mouse.x - cache.x) * 0.1;
      cache.y += (mouse.y - cache.y) * 0.1;
      if (Math.hypot(mouse.x - last.x, mouse.y - last.y) > threshold) {
        spawn();
        last.x = mouse.x;
        last.y = mouse.y;
      }
      if (Math.abs(cache.x - mouse.x) > 0.5 || Math.abs(cache.y - mouse.y) > 0.5) {
        raf = requestAnimationFrame(loop);
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      if (!started) {
        started = true;
        cache.x = last.x = mouse.x;
        cache.y = last.y = mouse.y;
      }
      if (!raf) raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      images.forEach(el => el.getAnimations().forEach(a => a.cancel()));
    };
  }, [items, threshold, lifetime, exitScale]);

  return (
    <div
      ref={containerRef}
      className={`image-trail ${className}`.trim()}
      aria-hidden="true"
      style={{
        '--trail-size': `${size}px`,
        '--trail-aspect': String(aspectRatio),
        '--trail-radius': `${radius}px`
      } as React.CSSProperties}
    >
      {items.map((url, i) => (
        <div className="image-trail__img" data-trail-image="" key={i}>
          <div className="image-trail__inner" style={{ backgroundImage: `url(${url})` }} />
        </div>
      ))}
    </div>
  );
}
