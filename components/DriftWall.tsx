'use client';

// Basado en DriftWall de React Bits (https://reactbits.dev).
// Cambios respecto al original:
// - TypeScript, `id` estable por item y `onItemClick` para abrir el visor propio.
// - `overlayOpacity` configurable (antes fijo en 0.42 en el CSS).
// - `orientation`: carriles verticales (columnas) u horizontales (filas). Con `roll` el muro gira
//   en diagonal; el largo y la cantidad de carriles se calculan para cubrir la pantalla rotada.
// - Reparto de fotos que evita repetirlas a la vista y limita las fichas por carril.
// - Plano de tamaño fijo (el original se centraba según el carril más largo y dejaba huecos).
// - Recentrado: con la perspectiva y el giro el lado cercano se ve más grande y el muro parecía corrido.
// - Clic robusto: la foto se elige al presionar (el muro sigue moviéndose y la capa elevada por hover
//   antes no recibía el clic, así que fallaba cerca de los bordes).
// - Desvanecido solo arriba y abajo (en DriftWall.css).

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './DriftWall.css';

export type DriftWallItem = {
  image: string;
  title?: string;
  href?: string;
  id?: string;
};

type DriftWallProps = {
  items?: DriftWallItem[];
  /** Evento a mostrar. Si cambia, las fotos salen en orden aleatorio, el muro se reacomoda sin verse
   * y entran las nuevas cuando itemsKey coincida (items ya trae las fotos de ese evento) */
  transitionKey?: string;
  /** Evento al que pertenece items */
  itemsKey?: string;
  /** Cantidad de carriles (columnas en vertical, filas en horizontal) */
  columns?: number;
  orientation?: 'vertical' | 'horizontal';
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  radius?: number;
  tilt?: number;
  turn?: number;
  roll?: number;
  perspective?: number;
  depth?: number;
  speed?: number;
  direction?: 'up' | 'down';
  variance?: number;
  /** Tamaño (multiplica la ficha) y velocidad (multiplica speed) de cada carril; reemplaza a variance */
  lanes?: { scale: number; speed: number }[];
  parallax?: number;
  pauseOnHover?: boolean;
  lift?: number;
  fade?: number;
  dim?: number;
  grayscale?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
  onItemClick?: (item: DriftWallItem) => void;
  /** Detiene la animación (las fotos quedan donde están), p. ej. con un modal encima */
  paused?: boolean;
};

const DEFAULT_ITEMS: DriftWallItem[] = Array.from({ length: 15 }, (_, i) => {
  const ids = [1015, 1025, 1039, 1043, 1044, 1050, 1062, 1069, 1074, 1080, 1084, 106, 110, 133, 164];
  return {
    image: `https://picsum.photos/id/${ids[i % ids.length]}/600/400`,
    title: `Tile ${i + 1}`,
    href: undefined
  };
});

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Largo del plano (en el sentido del desplazamiento) respecto a lo que hay que cubrir:
// margen para la inclinación, la escala y la perspectiva
const SPAN_FACTOR = 2;
// Movimiento máximo (px) entre presionar y soltar para contarlo como clic (el dedo es menos preciso)
const CLICK_SLOP = 10;
const TOUCH_SLOP = 18;
// Tiempo durante el que se descarta el click fantasma que el navegador dispara tras un toque
const GHOST_CLICK_MS = 800;

const columnFactor = (index: number, variance: number) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
};

// Ventana tras la primera foto lista en la que las fotos aparecen con animación
const INTRO_WINDOW_MS = 3000;
// Cambio de evento: los carriles se apagan y encienden uno por uno (cada carril ya es una capa propia,
// así que animar su opacidad es casi gratis; animar cientos de fotos a la vez congelaba el muro)
const LANE_STAGGER_MS = 60;
const LANE_FADE_MS = 350;
// Tope de espera a que carguen las fotos visibles de un carril antes de encenderlo
const LANE_LOAD_WAIT_MS = 1200;

// Retraso de entrada/salida de cada foto (0–500 ms), aleatorio pero estable por foto
const tileDelay = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `${Math.abs(h) % 500}ms`;
};

type LaneProps = {
  c: number;
  items: DriftWallItem[];
  copies: number;
  tileW?: string;
  tileH?: string;
  setTrackRef: (c: number, el: HTMLDivElement | null) => void;
  renderTile: (item: DriftWallItem, id: string, colIndex: number, itemIndex: number) => React.ReactNode;
};

// Un carril. Memoizado: solo se vuelve a renderizar si cambian sus fotos o su tamaño. Antes cualquier
// cambio de estado del muro recorría las ~370 fichas (~45 ms) y trababa el cambio de evento.
const Lane = memo(function Lane({ c, items, copies, tileW, tileH, setTrackRef, renderTile }: LaneProps) {
  return (
    <div
      className="drift-wall__col"
      style={tileW ? ({ '--dw-tile-w': tileW, '--dw-tile-h': tileH } as React.CSSProperties) : undefined}
    >
      <div className="drift-wall__track" ref={el => setTrackRef(c, el)}>
        {Array.from({ length: copies }, (_, copyIndex) =>
          items.map((item, itemIndex) =>
            // Key por posición: al cambiar de evento se reutiliza la ficha y solo cambia su foto
            renderTile(item, `${c}-${copyIndex}-${itemIndex}`, c, itemIndex)
          )
        )}
      </div>
    </div>
  );
});

const DriftWall = ({
  items = DEFAULT_ITEMS,
  transitionKey = '',
  itemsKey = '',
  columns = 5,
  orientation = 'vertical',
  tileWidth = 200,
  tileHeight = 132,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = 'up',
  variance = 0.45,
  lanes,
  parallax = 0.6,
  pauseOnHover = false,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  grayscale = false,
  overlayColor = '#060010',
  overlayOpacity = 0.42,
  className = '',
  style,
  onItemClick,
  paused = false
}: DriftWallProps) => {
  const horizontal = orientation === 'horizontal';
  const containerRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const offsetsRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const hoveredColRef = useRef(-1);
  const wallHoveredRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const pointerDampedRef = useRef({ x: 0, y: 0 });
  const lastTsRef = useRef<number | null>(null);
  const pressRef = useRef<{ col: number; idx: number; x: number; y: number; valid?: boolean } | null>(null);
  // Hasta cuándo ignorar el click fantasma posterior a abrir una foto con el dedo
  const suppressClickUntilRef = useRef(0);

  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(0);
  // Corrección (px) en el eje transversal para que lo visible quede centrado pese a la perspectiva
  const centerOffsetRef = useRef(0);
  // La foto activa se marca con una clase directo en el DOM: con estado de React cada hover volvía a
  // renderizar todas las fotos del muro
  const activeIdRef = useRef<string | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);
  const markActive = useCallback((el: HTMLElement | null) => {
    if (activeElRef.current === el) return;
    activeElRef.current?.classList.remove('is-active');
    el?.classList.add('is-active');
    activeElRef.current = el;
  }, []);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Largo a cubrir en el sentido del desplazamiento: con el muro girado, la pantalla rotada
  // proyecta ancho y alto sobre el carril
  const unit = (horizontal ? tileWidth : tileHeight) + gap;
  // Largo de una ficha (más espacio) en cada carril: con lanes cada carril tiene su tamaño
  const laneScale = useCallback((c: number) => lanes?.[c]?.scale ?? 1, [lanes]);
  const laneUnit = useCallback(
    (c: number) => (horizontal ? tileWidth : tileHeight) * laneScale(c) + gap,
    [horizontal, tileWidth, tileHeight, gap, laneScale]
  );
  const minUnit = useMemo(
    () => Math.min(unit, ...Array.from({ length: columns }, (_, c) => laneUnit(c))),
    [unit, columns, laneUnit]
  );
  const planeMain = useMemo(() => {
    const width = containerWidth || 1000;
    const mainLen = horizontal ? width : containerHeight;
    const crossLen = horizontal ? containerHeight : width;
    const rad = (roll * Math.PI) / 180;
    return (mainLen * Math.abs(Math.cos(rad)) + crossLen * Math.abs(Math.sin(rad))) * SPAN_FACTOR;
  }, [horizontal, containerWidth, containerHeight, roll]);

  // Fotos que se pintan. Cambian de inmediato si es el mismo evento (fotos aprobadas en vivo); si cambia
  // el evento, se apagan los carriles (phase 'exit'), se cambia la foto de cada ficha y se encienden.
  // 'enter' es solo la entrada de la primera carga (foto por foto, con desenfoque).
  const [shown, setShown] = useState({ items, key: itemsKey });
  const shownItems = shown.items;
  const [phase, setPhase] = useState<'enter' | 'idle' | 'exit'>('enter');
  const [exitDone, setExitDone] = useState(false);
  // Se cambiaron las fotos tras apagar los carriles: encenderlos cuando ya estén pintadas
  const swappedRef = useRef(false);
  // Durante el cambio de evento, lo que se pinta de cada carril: se pasa a las fotos nuevas carril por
  // carril (repartiendo el trabajo) justo antes de encenderlo. null = se pintan las fotos actuales.
  const [stagedLanes, setStagedLanes] = useState<DriftWallItem[][] | null>(null);
  const displayedRef = useRef<DriftWallItem[][]>([]);

  // Apaga o enciende los carriles en orden aleatorio. Al encender, cada carril espera a que carguen
  // sus fotos visibles (con tope) para no aparecer vacío.
  const laneTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const laneRunRef = useRef(0);
  const fadeLanes = useCallback((visible: boolean, swapTo?: DriftWallItem[][]) => {
    laneTimersRef.current.forEach(clearTimeout);
    laneTimersRef.current = [];
    const run = ++laneRunRef.current;
    let done = 0;
    const tracks = trackRefs.current.filter((t): t is HTMLDivElement => !!t);
    const order = tracks.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((idx, k) => {
      laneTimersRef.current.push(setTimeout(async () => {
        const track = tracks[idx];
        if (swapTo) {
          setStagedLanes(prev => {
            if (!prev) return prev;
            const next = [...prev];
            next[idx] = swapTo[idx] ?? [];
            return next;
          });
          // Dejar que React pinte las fotos nuevas de este carril antes de esperar su carga
          await new Promise(resolve => setTimeout(resolve, 40));
          if (run !== laneRunRef.current) return;
        }
        if (visible) {
          const box = containerRef.current?.getBoundingClientRect();
          const imgs = Array.from(track.querySelectorAll('img')).filter(img => {
            const r = img.getBoundingClientRect();
            return box && r.bottom > box.top && r.top < box.bottom && r.right > box.left && r.left < box.right;
          });
          await Promise.race([
            Promise.all(imgs.map(img => img.decode().catch(() => undefined))),
            new Promise(resolve => setTimeout(resolve, LANE_LOAD_WAIT_MS))
          ]);
        }
        if (run !== laneRunRef.current) return;
        track.style.opacity = visible ? '' : '0';
        if (swapTo && ++done === order.length) setStagedLanes(null);
      }, k * LANE_STAGGER_MS));
    });
  }, []);
  useEffect(() => () => laneTimersRef.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (transitionKey === shown.key) {
      // Se volvió al evento que ya estaba a media salida: los carriles regresan sin reacomodar
      if (phase === 'exit') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhase('idle');
        setStagedLanes(null);
        fadeLanes(true);
      }
      if (itemsKey === shown.key && items !== shown.items) setShown({ items, key: itemsKey });
      return;
    }
    if (phase !== 'exit') {
      setPhase('exit');
      setExitDone(false);
      return;
    }
    // Ya se apagaron los carriles y llegaron las fotos del evento nuevo: se cambia la foto de cada ficha
    // (las fichas y el movimiento siguen) y se encienden los carriles
    if (exitDone && itemsKey === transitionKey) {
      setStagedLanes(displayedRef.current);
      setShown({ items, key: itemsKey });
      setPhase('idle');
      swappedRef.current = true;
    }
  }, [items, itemsKey, transitionKey, shown, phase, exitDone, fadeLanes]);


  useEffect(() => {
    if (phase !== 'exit') return;
    fadeLanes(false);
    const t = setTimeout(() => setExitDone(true), columns * LANE_STAGGER_MS + LANE_FADE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Reparto de las fotos actuales en los carriles
  const targetLanes = useMemo(() => {
    const n = shownItems.length;
    if (n === 0) return Array.from({ length: columns }, () => [] as DriftWallItem[]);

    // Fichas que caben a lo largo de un carril
    const visiblePerLane = Math.ceil(planeMain / minUnit);

    // Suficientes fotos: cada una aparece en un solo carril y no se repite a la vista
    if (n >= columns * visiblePerLane) {
      const cols: DriftWallItem[][] = Array.from({ length: columns }, () => []);
      shownItems.forEach((item, i) => cols[i % columns].push(item));
      return cols;
    }

    // Pocas fotos: cada carril toma un tramo desfasado (nunca la misma foto en carriles vecinos
    // ni dos veces seguidas), limitado a lo que cabe en pantalla para no inflar el DOM
    const perLane = Math.min(n, Math.max(Math.ceil(n / columns), visiblePerLane));
    const step = Math.max(1, Math.floor(n / columns));
    return Array.from({ length: columns }, (_, c) =>
      Array.from({ length: perLane }, (_, k) => shownItems[(c * step + k) % n])
    );
  }, [shownItems, columns, planeMain, minUnit]);

  // Lo que se pinta: el reparto actual, o durante un cambio de evento la mezcla carril por carril
  const columnItems = stagedLanes ?? targetLanes;
  useEffect(() => {
    displayedRef.current = columnItems;
  }, [columnItems]);

  // Fotos del evento nuevo listas: encender los carriles pasando cada uno a sus fotos nuevas
  useEffect(() => {
    if (!swappedRef.current) return;
    swappedRef.current = false;
    fadeLanes(true, targetLanes);
  }, [targetLanes, fadeLanes]);

  const columnMeta = useMemo(() => {
    return columnItems.map((col, c) => {
      const u = laneUnit(c);
      const copyHeight = Math.max(u, col.length * u);
      // La vista empieza al inicio del plano; el track se desplaza hasta una copia completa,
      // así que debe cubrir esa copia más todo el largo del plano.
      const copies = Math.max(2, Math.ceil(planeMain / copyHeight) + 1);
      return { copyHeight, copies };
    });
  }, [columnItems, laneUnit, planeMain]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    // Medir ya, sin esperar al ResizeObserver: con el valor inicial (600) el plano queda corto
    setContainerHeight(containerRef.current.clientHeight || 600);
    setContainerWidth(containerRef.current.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height || 600);
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const baseVelocities = useMemo(() => {
    const dirSign = direction === 'up' ? 1 : -1;
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      const factor = lanes ? lanes[c]?.speed ?? 1 : columnFactor(c, variance);
      return speed * factor * dirSign * altSign;
    });
  }, [columnItems, speed, direction, variance, lanes]);

  // Al cambiar las fotos (otro evento, fotos en vivo) cada carril sigue desde donde iba y a la misma
  // velocidad; solo los carriles nuevos arrancan desde una posición desfasada
  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, c) => {
      const prev = offsetsRef.current[c];
      return prev === undefined ? meta.copyHeight * ((c * 0.37) % 1) : prev % meta.copyHeight;
    });
    velocitiesRef.current = columnItems.map((_, c) => velocitiesRef.current[c] ?? 0);
  }, [columnMeta, columnItems]);

  const applyPlaneTransform = useCallback(
    (px: number, py: number) => {
      const plane = planeRef.current;
      if (!plane) return;
      const recenter = horizontal ? `translateY(${centerOffsetRef.current}px)` : `translateX(${centerOffsetRef.current}px)`;
      plane.style.transform =
        `translate(-50%, -50%) ${recenter} scale(1.18) ` +
        `rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) ` +
        `translateZ(${-depth}px)`;
    },
    [horizontal, tilt, turn, roll, depth]
  );

  const setTrackOffset = useCallback(
    (el: HTMLDivElement, offset: number) => {
      el.style.transform = horizontal ? `translate3d(${-offset}px, 0, 0)` : `translate3d(0, ${-offset}px, 0)`;
    },
    [horizontal]
  );

  // Centrar lo que realmente se ve en el eje transversal a los carriles: mide las fichas visibles ya
  // proyectadas (en reposo, sin parallax) y desplaza el plano. En diagonal el muro ya cubre toda la
  // pantalla (los carriles se calculan con la diagonal), así que no hace falta.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const plane = planeRef.current;
    if (!container || !plane || containerWidth === 0) return;

    if (roll !== 0) {
      centerOffsetRef.current = 0;
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);
      return;
    }

    const box = container.getBoundingClientRect();
    const tiles = plane.getElementsByClassName('drift-wall__inner');
    for (let i = 0; i < 4; i++) {
      applyPlaneTransform(0, 0);
      let start = Infinity;
      let end = -Infinity;
      for (const tile of tiles) {
        const r = tile.getBoundingClientRect();
        if (r.width === 0) continue;
        if (horizontal) {
          if (r.height > box.height || r.right < box.left || r.left > box.right) continue;
          start = Math.min(start, r.top);
          end = Math.max(end, r.bottom);
        } else {
          if (r.width > box.width || r.bottom < box.top || r.top > box.bottom) continue;
          start = Math.min(start, r.left);
          end = Math.max(end, r.right);
        }
      }
      if (!Number.isFinite(start)) return;
      const center = horizontal ? (box.top + box.bottom) / 2 : (box.left + box.right) / 2;
      const delta = center - (start + end) / 2;
      if (Math.abs(delta) < 1) break;
      centerOffsetRef.current += delta;
    }
    applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);
  }, [applyPlaneTransform, horizontal, roll, lanes, columns, containerWidth, containerHeight, tileWidth, tileHeight, gap, perspective]);

  useEffect(() => {
    // En pausa no corre el loop: nada cambia detrás del vidrio y el navegador no recalcula sus filtros
    if (paused) return;

    const animate = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const maxTilt = parallax * 8;
      const targetX = pointerRef.current.x * maxTilt;
      const targetY = -pointerRef.current.y * maxTilt;
      const damp = 1 - Math.exp(-dt / 0.12);
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp;
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp;
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);

      for (let c = 0; c < trackRefs.current.length; c++) {
        const meta = columnMeta[c];
        const el = trackRefs.current[c];
        if (!meta || !el) continue;

        if (!reduced) {
          const paused = wallHoveredRef.current && pauseOnHover;
          const factor = paused || hoveredColRef.current === c ? 0 : 1;
          const target = baseVelocities[c] * factor;

          const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
          velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease;
          let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt;
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
          offsetsRef.current[c] = next;
        }
        setTrackOffset(el, offsetsRef.current[c] ?? 0);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [baseVelocities, columnMeta, pauseOnHover, parallax, reduced, applyPlaneTransform, setTrackOffset, paused]);

  const activate = useCallback((el: HTMLElement, id: string, index: number) => {
    activeIdRef.current = id;
    hoveredColRef.current = index;
    markActive(el);
  }, [markActive]);
  const release = useCallback(() => {
    activeIdRef.current = null;
    hoveredColRef.current = -1;
    markActive(null);
  }, [markActive]);

  // Entrada (al montar y en cada cambio de evento): las fotos que cargan en los primeros segundos
  // aparecen con fade y desenfoque, cada una con su retraso aleatorio. Después, las que van entrando
  // aparecen sin animación. Cada foto se marca con una clase en el DOM para no volver a renderizar
  // todo el muro por cada imagen.
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
    if (phase !== 'enter' && introTimerRef.current) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  }, [phase]);
  const reveal = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.classList.add('is-loaded');
    // La ventana de entrada empieza con la primera foto lista
    if (phaseRef.current === 'enter' && !introTimerRef.current) {
      introTimerRef.current = setTimeout(() => {
        introTimerRef.current = null;
        setPhase(p => (p === 'enter' ? 'idle' : p));
      }, INTRO_WINDOW_MS);
    }
  }, []);
  // Si ya venía de la caché, onLoad puede dispararse antes de enganchar el evento: revelar en el
  // siguiente cuadro para que igual se vea la transición
  const revealIfCached = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) requestAnimationFrame(() => img.classList.add('is-loaded'));
  }, []);
  useEffect(() => () => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (parallax > 0 && !reduced) {
        pointerRef.current = {
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5
        };
      }
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const tile = hit?.closest<HTMLElement>('[data-tile-id]');
      if (!tile) return;
      const id = tile.dataset.tileId ?? null;
      if (id === activeIdRef.current) return;
      activeIdRef.current = id;
      hoveredColRef.current = Number(tile.dataset.col);
      markActive(tile);
    },
    [parallax, reduced, markActive]
  );

  const handlePointerLeaveWall = useCallback(() => {
    wallHoveredRef.current = false;
    pointerRef.current = { x: 0, y: 0 };
    pressRef.current = null;
    release();
  }, [release]);

  // Abrir una foto. La foto se elige al presionar, así que se abre la correcta aunque el carril
  // se haya desplazado bajo el cursor mientras tanto.
  // - Mouse/touchpad: se abre en el evento click.
  // - Dedo/lápiz: se abre al soltar. No se espera al click porque (1) tras soltar el navegador dispara
  //   pointerleave antes del click, (2) Chrome "corrige" el punto del toque y (3) si el visor ya se
  //   abrió, el click fantasma cae sobre su fondo y lo cierra. Ese click fantasma se descarta.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const tile = (e.target as HTMLElement).closest<HTMLElement>('[data-tile-id]');
    if (!tile || tile.dataset.idx === undefined) {
      pressRef.current = null;
      return;
    }
    pressRef.current = { col: Number(tile.dataset.col), idx: Number(tile.dataset.idx), x: e.clientX, y: e.clientY };
  }, []);

  const openPressed = useCallback(
    (press: { col: number; idx: number }) => {
      if (!onItemClick) return;
      const item = columnItems[press.col]?.[press.idx];
      if (item && !item.href) onItemClick(item);
    },
    [columnItems, onItemClick]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const press = pressRef.current;
      if (!press) return;
      const touchLike = e.pointerType !== 'mouse';
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > (touchLike ? TOUCH_SLOP : CLICK_SLOP);

      if (!touchLike) {
        press.valid = !moved; // el click (que llega después) decide
        return;
      }

      pressRef.current = null;
      if (moved) return;
      suppressClickUntilRef.current = performance.now() + GHOST_CLICK_MS;
      // Descartar el click fantasma esté donde esté (puede caer sobre el visor recién abierto)
      const swallow = (ev: MouseEvent) => {
        if (performance.now() > suppressClickUntilRef.current) return;
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), GHOST_CLICK_MS);
      openPressed(press);
    },
    [openPressed]
  );

  const handleClick = useCallback(() => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press?.valid) return;
    openPressed(press);
  }, [openPressed]);

  // Cancelar en origen el click que sigue a un toque que ya abrió una foto
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onTouchEnd = (e: TouchEvent) => {
      if (performance.now() < suppressClickUntilRef.current && e.cancelable) e.preventDefault();
    };
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => container.removeEventListener('touchend', onTouchEnd);
  }, []);

  const cssVars = useMemo(
    () =>
      ({
        '--dw-tile-w': `${tileWidth}px`,
        '--dw-tile-h': `${tileHeight}px`,
        '--dw-gap': `${gap}px`,
        '--dw-radius': `${radius}px`,
        '--dw-perspective': `${perspective}px`,
        '--dw-lift': `${lift}px`,
        '--dw-dim': dim,
        '--dw-overlay': overlayColor,
        '--dw-overlay-opacity': overlayOpacity,
        '--dw-edge': `${Math.max(0, (1 - fade) * 100)}%`,
        ...style
      }) as React.CSSProperties,
    [tileWidth, tileHeight, gap, radius, perspective, lift, dim, overlayColor, overlayOpacity, fade, style]
  );

  // Estable entre renders (los carriles memoizados lo reciben); onItemClick se lee de una ref porque
  // suele llegar como función nueva en cada render
  const onItemClickRef = useRef(onItemClick);
  useEffect(() => {
    onItemClickRef.current = onItemClick;
  }, [onItemClick]);
  const setTrackRef = useCallback((c: number, el: HTMLDivElement | null) => {
    trackRefs.current[c] = el;
  }, []);
  const renderTile = useCallback((item: DriftWallItem, id: string, colIndex: number, itemIndex: number) => {
    const inner = (
      <span className="drift-wall__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.title ?? ''}
          loading="lazy"
          decoding="async"
          draggable={false}
          ref={revealIfCached}
          onLoad={reveal}
          onError={reveal}
        />
        <span className="drift-wall__overlay" aria-hidden="true" />
      </span>
    );
    const commonProps = {
      className: 'drift-wall__tile',
      'data-tile-id': id,
      'data-col': colIndex,
      'data-idx': itemIndex,
      style: { '--dw-delay': tileDelay(id) } as React.CSSProperties,
      onFocus: (e: React.FocusEvent<HTMLElement>) => activate(e.currentTarget, id, colIndex),
      onBlur: release
    };
    if (item.href) {
      return (
        <a key={id} href={item.href} target="_blank" rel="noreferrer noopener" {...commonProps}>
          {inner}
        </a>
      );
    }
    return (
      <div
        key={id}
        tabIndex={0}
        role="button"
        aria-label={item.title ?? 'tile'}
        onKeyDown={e => {
          if (onItemClickRef.current && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onItemClickRef.current(item);
          }
        }}
        {...commonProps}
      >
        {inner}
      </div>
    );
  }, [activate, release, reveal, revealIfCached]);

  const rootClass = [
    'drift-wall',
    horizontal ? 'drift-wall--horizontal' : '',
    lift !== 0 ? 'drift-wall--lift' : '',
    phase === 'enter' ? 'drift-wall--intro' : '',
    grayscale ? 'drift-wall--gray' : '',
    reduced ? 'drift-wall--reduced' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      className={rootClass}
      style={cssVars}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onPointerEnter={() => {
        wallHoveredRef.current = true;
      }}
      onPointerLeave={handlePointerLeaveWall}
      role="group"
      aria-label="Drifting wall of tiles"
    >
      <div
        ref={planeRef}
        className="drift-wall__plane"
        style={horizontal ? { width: planeMain } : { height: planeMain }}
      >
        {columnItems.map((col, c) => (
          <Lane
            key={`col-${c}`}
            c={c}
            items={col}
            copies={columnMeta[c].copies}
            tileW={lanes ? `${tileWidth * laneScale(c)}px` : undefined}
            tileH={lanes ? `${tileHeight * laneScale(c)}px` : undefined}
            setTrackRef={setTrackRef}
            renderTile={renderTile}
          />
        ))}
      </div>
    </div>
  );
};

export default DriftWall;
