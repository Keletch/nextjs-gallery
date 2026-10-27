'use client';

// Basado en DomeGallery de React Bits (https://reactbits.dev).
// Cambios respecto al original:
// - TypeScript y sin @use-gesture: el arrastre va con pointer events.
// - Gira solo. Al soltar un arrastre sigue con su impulso y vuelve poco a poco a girar solo.
// - Vertical sin límite: en vez de inclinar la esfera (se topaba a ±5° y pasando el polo las fotos
//   quedarían de cabeza) las filas se deslizan por la superficie y dan la vuelta por arriba/abajo,
//   donde el desvanecido las oculta. Las fotos siempre quedan derechas.
// - Filas en toda la banda visible, con fichas más chicas hacia arriba y abajo (curvatura del globo).
// - Las fotos se van cambiando con el tiempo (fundido entre dos capas), así pasan todas las del evento.
// - Al tocar una foto se llama a onItemClick (el visor propio) en vez de su ampliación interna.
// - Sin filtro gris ni desenfoque de bordes (backdrop-filter a pantalla completa en cada cuadro).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DriftWallItem } from './DriftWall';
import './DomeGallery.css';

type DomeGalleryProps = {
  items: DriftWallItem[];
  /** Evento al que pertenece items: si cambia, el globo se apaga, cambia las fotos y vuelve a encender */
  itemsKey?: string;
  /** Con el visor abierto el globo se detiene */
  paused?: boolean;
  /** true: las fotos se cambian sin parar (vivo). false: se quedan fijas */
  shuffle?: boolean;
  onItemClick?: (item: DriftWallItem) => void;
};

// Radio del globo respecto a la diagonal de la pantalla y perspectiva respecto al radio. Con la
// cámara cerca (perspectiva = 1 radio) se curva más; el radio alcanza para que nunca se vea el borde
// del globo, solo su curvatura
// Con perspectiva 1 el borde del globo queda a ~0.58 radios del centro: 0.89 diagonales lo deja
// apenas fuera de las esquinas, así las orillas se curvan mucho sin acercar la cámara
const RADIUS_PER_DIAGONAL = 0.89;
const PERSPECTIVE_PER_RADIUS = 1;
// Giro solo (px por segundo en el frente) y cuánto tarda en volver a él después de un arrastre
const AUTO_SPEED_PX = 45;
const RETURN_TAU = 1.4;
const VERTICAL_TAU = 0.9;
const MAX_FLING_PX = 3000;
// Al abrir una foto el globo no se congela de golpe: sigue frenando un momento detrás del visor
const COAST_MS = 900;
const COAST_TAU = 0.3;
// Mientras hay movimiento vertical, solo se recolocan las fichas a menos de esto del frente
const FRONT_MOVE_DEG = 115;
// Modo vivo: cuántos caminantes cambian fotos a la vez, cada cuánto dan un paso, y cuánto dura el
// fundido (ver DomeGallery.css)
const WALKERS = 4;
const SWAP_EVERY_MS = 1000;
// Una ficha que acaba de cambiar no vuelve a cambiar (ni la toca otro contagio) hasta pasado esto
const COOLDOWN_MS = 8000;
const FADE_MS = 420;
// Entrada fade + blur de cada ficha (como el muro) y retraso máximo entre fichas
const INTRO_MS = 600;
const INTRO_SPREAD_MS = 900;
// Fichas que se crean por cuadro al montar el globo
const TILES_PER_FRAME = 24;
// Al entrar solo reciben foto las fichas a menos de esto del frente; las demás, tantas por cuadro
const FRONT_DEG = 100;
const BACK_PER_FRAME = 10;
// Arriba de esto (px) un toque cuenta como arrastre y no abre la foto
const TAP_SLOP = 6;

type Tile = { lon: number; lat: number };

function globeLayout(width: number, height: number) {
  const radius = Math.round(Math.hypot(width, height) * RADIUS_PER_DIAGONAL);
  // Fichas de ~24% del lado corto de la pantalla (115–200 px en el ecuador)
  const tileArc = Math.min(200, Math.max(115, Math.min(width, height) * 0.24));
  const cols = Math.max(12, Math.round((2 * Math.PI * radius) / tileArc));
  const colStep = 360 / cols;
  // Latitud más alta que alcanza a verse con esa perspectiva: las filas solo ocupan esa banda más
  // una fila, y dan la vuelta fuera de la vista
  const p = PERSPECTIVE_PER_RADIUS;
  let visibleLat = 0;
  while (visibleLat < 85) {
    const a = ((visibleLat + 0.5) * Math.PI) / 180;
    if ((radius * Math.sin(a) * p) / (p + 1 - Math.cos(a)) > height / 2) break;
    visibleLat += 0.5;
  }
  const rows = Math.max(3, Math.ceil((2 * visibleLat) / colStep) + 2);
  const rowStep = colStep;
  const band = (rows * rowStep) / 2;
  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Filas alternas corridas media ficha, como el original
      tiles.push({ lon: (c + (r % 2) * 0.5) * colStep, lat: -band + (r + 0.5) * rowStep });
    }
  }
  return { radius, cols, colStep, rowStep, band, tiles };
}

// Vecinas de una ficha en la cuadrícula con filas alternas corridas media ficha (ver globeLayout)
function neighborsOf(i: number, cols: number, rows: number) {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const at = (rr: number, cc: number) => ((rr + rows) % rows) * cols + ((cc + cols) % cols);
  const side = r % 2 === 1 ? [c, c + 1] : [c - 1, c];
  return [at(r, c - 1), at(r, c + 1), ...side.map(cc => at(r - 1, cc)), ...side.map(cc => at(r + 1, cc))];
}

const wrapLat = (lat: number, band: number) => ((((lat + band) % (2 * band)) + 2 * band) % (2 * band)) - band;

export default function DomeGallery({ items, itemsKey = '', paused = false, shuffle = true, onItemClick }: DomeGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(prev => (prev.width === Math.round(width) && prev.height === Math.round(height) ? prev : { width: Math.round(width), height: Math.round(height) }));
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => (size.width ? globeLayout(size.width, size.height) : null), [size]);
  // Grados que gira el globo por cada px que avanza su frente
  const degPerPx = layout ? 180 / (Math.PI * layout.radius) : 0.1;
  const autoSpeed = AUTO_SPEED_PX * degPerPx;

  // Estado del movimiento en refs: se actualiza en cada cuadro sin pasar por React
  const spinRef = useRef(0);
  // Hay que recolocar fichas (cambió el desplazamiento vertical) / quedaron sin recolocar las de atrás
  const tilesDirtyRef = useRef(false);
  const backStaleRef = useRef(false);
  const shiftRef = useRef(0);
  const velRef = useRef({ x: 0, y: 0 });
  const autoDirRef = useRef(1);
  const dragRef = useRef<{ id: number; x: number; y: number; t: number; moved: boolean; vx: number; vy: number } | null>(null);

  // Qué foto muestra cada ficha y en qué capa (0/1) está la visible
  const shownRef = useRef<number[]>([]);
  const layerRef = useRef<number[]>([]);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // onlyFront: durante un movimiento vertical solo se recolocan las fichas de la mitad de enfrente
  // (con margen para las que van entrando al girar); las de atrás no se ven y se ponen al día en una
  // pasada completa cuando el movimiento termina. Recolocar las ~330 fichas en cada evento del mouse
  // (a veces dos por cuadro) bajaba el arrastre vertical a ~48 fps.
  const placeTiles = useCallback((onlyFront = false) => {
    if (!layout) return;
    const shift = shiftRef.current;
    layout.tiles.forEach((tile, i) => {
      const el = tileRefs.current[i];
      if (!el) return;
      if (onlyFront && Math.abs(((((tile.lon + spinRef.current) % 360) + 540) % 360) - 180) > FRONT_MOVE_DEG) return;
      const lat = wrapLat(tile.lat + shift, layout.band);
      // Más chica hacia los polos para que no se encimen (la circunferencia de la fila se achica)
      const k = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
      el.style.transform = `rotateY(${tile.lon}deg) rotateX(${lat}deg) translateZ(var(--dome-radius)) scale(${k})`;
    });
  }, [layout]);

  const applySpin = useCallback(() => {
    if (sphereRef.current) sphereRef.current.style.transform = `translateZ(calc(var(--dome-radius) * -1)) rotateY(${spinRef.current}deg)`;
  }, []);

  // Las fichas se crean por tandas, unas cuantas por cuadro: crear las ~330 juntas trababa el cambio
  // de vista. Siguen ocultas hasta que están todas y entran con su fade + blur.
  const tileCount = layout?.tiles.length ?? 0;
  const [tileBudget, setTileBudget] = useState(0);
  useEffect(() => {
    if (tileBudget >= tileCount) return;
    const frame = requestAnimationFrame(() => setTileBudget(b => Math.min(tileCount, b + TILES_PER_FRAME)));
    return () => cancelAnimationFrame(frame);
  }, [tileBudget, tileCount]);
  const tilesReady = tileCount > 0 && tileBudget >= tileCount;

  useEffect(() => {
    placeTiles();
    applySpin();
  }, [placeTiles, applySpin, tileBudget]);

  // Movimiento: giro solo + impulso del arrastre que se va apagando. En pausa (visor abierto) frena
  // suave durante COAST_MS y luego se detiene: así el toque no se ve como un congelado instantáneo
  useEffect(() => {
    if (!layout) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let last = performance.now();
    const pausedAt = paused ? last : 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const vel = velRef.current;
      // Presionar sin arrastrar no frena: el globo sigue hasta que el dedo de verdad se mueve
      if (!dragRef.current?.moved) {
        const target = reduced || paused ? 0 : autoSpeed * autoDirRef.current;
        vel.x += (target - vel.x) * (1 - Math.exp(-dt / (paused ? COAST_TAU : RETURN_TAU)));
        vel.y *= Math.exp(-dt / VERTICAL_TAU);
        if (Math.abs(vel.y) < 0.05) vel.y = 0;
        spinRef.current = (spinRef.current + vel.x * dt) % 360;
        applySpin();
        if (vel.y !== 0) {
          shiftRef.current = wrapLat(shiftRef.current + vel.y * dt, layout.band);
          tilesDirtyRef.current = true;
        }
      }
      // Fichas: a lo más una vez por cuadro; solo el frente mientras se mueve, todas al terminar
      if (tilesDirtyRef.current) {
        tilesDirtyRef.current = false;
        placeTiles(true);
        backStaleRef.current = true;
      } else if (backStaleRef.current && velRef.current.y === 0 && !dragRef.current?.moved) {
        backStaleRef.current = false;
        placeTiles();
      }
      if (paused && now - pausedAt > COAST_MS) return;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, layout, autoSpeed, applySpin, placeTiles]);

  // Arrastre: la superficie del frente sigue al dedo
  const onPointerDown = (e: React.PointerEvent) => {
    if (dragRef.current) return;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, vx: 0, vy: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!drag.moved) {
      drag.moved = true;
      velRef.current = { x: 0, y: 0 };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    const dt = Math.max(0.001, (now - drag.t) / 1000);
    // Velocidad suavizada para el impulso al soltar
    drag.vx = drag.vx * 0.6 + ((dx * degPerPx) / dt) * 0.4;
    drag.vy = drag.vy * 0.6 + ((-dy * degPerPx) / dt) * 0.4;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.t = now;
    spinRef.current = (spinRef.current + dx * degPerPx) % 360;
    if (layout) shiftRef.current = wrapLat(shiftRef.current - dy * degPerPx, layout.band);
    applySpin();
    if (dy !== 0) tilesDirtyRef.current = true;
  };
  const endDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) {
      // Toque: abrir la foto de la ficha
      if (e.type !== 'pointerup') return;
      const tileEl = (e.target as HTMLElement).closest<HTMLElement>('[data-tile]');
      const index = tileEl ? Number(tileEl.dataset.tile) : -1;
      const item = items[shownRef.current[index]];
      if (item) onItemClick?.(item);
      return;
    }
    // Si se soltó quieto, sin impulso
    const still = performance.now() - drag.t > 80;
    const maxFling = MAX_FLING_PX * degPerPx;
    const clamp = (v: number) => Math.max(-maxFling, Math.min(maxFling, v));
    velRef.current = still ? { x: 0, y: 0 } : { x: clamp(drag.vx), y: clamp(drag.vy) };
    if (!still && Math.abs(drag.vx) > autoSpeed) autoDirRef.current = Math.sign(drag.vx);
  };

  // Poner una foto en una ficha: en la capa oculta, y al cargar se cruza con la visible
  const setTileImage = useCallback((tileIndex: number, itemIndex: number, instant: boolean) => {
    const el = tileRefs.current[tileIndex];
    const item = items[itemIndex];
    if (!el || !item) return;
    shownRef.current[tileIndex] = itemIndex;
    el.setAttribute('aria-label', item.title ?? 'Abrir foto');
    const imgs = el.getElementsByTagName('img');
    if (instant) {
      layerRef.current[tileIndex] = 0;
      imgs[0].src = item.image;
      imgs[0].dataset.on = '1';
      imgs[1].dataset.on = '';
      return;
    }
    const next = 1 - (layerRef.current[tileIndex] ?? 0);
    const img = imgs[next];
    const show = () => {
      if (shownRef.current[tileIndex] !== itemIndex) return;
      layerRef.current[tileIndex] = next;
      img.dataset.on = '1';
      imgs[1 - next].dataset.on = '';
    };
    img.onload = show;
    img.src = item.image;
    if (img.complete) show();
  }, [items]);

  // Reparto inicial y al cambiar de evento: apagar, repartir, encender cuando cargue el frente. Solo
  // las fichas del frente reciben su foto de entrada; las de atrás (no se ven) la reciben después por
  // tandas, de la más cercana al frente a la más lejana, así la entrada no carga ~330 fotos de golpe
  useEffect(() => {
    if (!tilesReady || items.length === 0 || !layout) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
    let frame = 0;
    // Si cambia el evento a media carga, las tandas pendientes del anterior ya no deben aplicarse
    let cancelled = false;
    const timer = setTimeout(() => {
      shownRef.current = [];
      layerRef.current = [];
      // Recorre la lista en orden, saltando las fotos que ya están en las fichas cercanas ya repartidas
      // (dos anillos). Solo si el evento tiene muy pocas fotos no alcanza y se repiten cerca.
      const n = items.length;
      const { cols, tiles } = layout;
      const rows = tileCount / cols;
      const fromFront = (i: number) => Math.abs(((((tiles[i].lon + spinRef.current) % 360) + 540) % 360) - 180);
      const front: number[] = [];
      const back: { i: number; pick: number }[] = [];
      let next = 0;
      for (let i = 0; i < tileCount; i++) {
        const ring = neighborsOf(i, cols, rows).flatMap(t => [t, ...neighborsOf(t, cols, rows)]);
        const nearby = new Set(ring.map(t => shownRef.current[t]));
        let pick = next;
        for (let k = 0; k < n && nearby.has((next + k) % n); k++) pick = (next + k + 1) % n;
        if (nearby.has(pick)) pick = next;
        if (fromFront(i) < FRONT_DEG) {
          setTileImage(i, pick, true);
          front.push(i);
        } else {
          shownRef.current[i] = pick;
          back.push({ i, pick });
        }
        next = (pick + 1) % n;
      }
      const loadBack = () => {
        if (cancelled) return;
        back.splice(0, BACK_PER_FRAME).forEach(({ i, pick }) => setTileImage(i, pick, true));
        if (back.length) frame = requestAnimationFrame(loadBack);
      };
      const firstImgs = front.slice(0, 40).map(i => tileRefs.current[i]?.getElementsByTagName('img')[0]);
      Promise.race([
        Promise.all(firstImgs.map(img => img?.decode().catch(() => undefined))),
        new Promise(resolve => setTimeout(resolve, 1200)),
      ]).then(() => {
        if (cancelled) return;
        setVisible(true);
        // Las de atrás empiezan cuando ya terminó la entrada del frente
        back.sort((a, b) => fromFront(a.i) - fromFront(b.i));
        setTimeout(() => { frame = requestAnimationFrame(loadBack); }, INTRO_MS + INTRO_SPREAD_MS);
      });
    }, visibleRef.current ? INTRO_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // Solo al cambiar de evento o de cantidad de fichas: una foto aprobada en vivo entra con los cambios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, tileCount, tilesReady]);

  // Modo vivo: 4 "contagios" independientes. Cada uno cambia una foto por segundo y salta a una vecina
  // de la última que cambió (así se forman rastros); la que le pasó el contagio y la anterior no son
  // candidatas (seguimiento, no rebote). Van desfasados entre sí, así nunca cambian a la vez. Si uno se
  // sale del frente, vuelve a empezar en una ficha a la vista.
  useEffect(() => {
    if (!shuffle || paused || !layout || items.length < 2) return;
    const { cols, tiles } = layout;
    const rows = tiles.length / cols;
    const isFront = (i: number) => {
      const tile = tiles[i];
      const lon = ((((tile.lon + spinRef.current) % 360) + 540) % 360) - 180;
      return Math.abs(lon) < 30 && Math.abs(wrapLat(tile.lat + shiftRef.current, layout.band)) < layout.band - layout.rowStep;
    };
    const neighbors = (i: number) => neighborsOf(i, cols, rows);
    const randomFront = (allowed: (i: number) => boolean) => {
      const front = tiles.map((_, i) => i).filter(i => isFront(i) && allowed(i));
      return front.length ? front[Math.floor(Math.random() * front.length)] : -1;
    };
    // Foto nueva: de preferencia una que no esté en el globo; si no hay, una que no esté en la ficha ni
    // en las de alrededor (dos anillos); solo con muy pocas fotos se acepta repetir cerca
    const changedAt = new Map<number, number>();
    const swap = (i: number) => {
      const all = items.map((_, k) => k);
      const ring = new Set([i, ...neighbors(i).flatMap(n => [n, ...neighbors(n)])]);
      const nearby = new Set([...ring].map(t => shownRef.current[t]));
      const inUse = new Set(shownRef.current);
      const pools = [all.filter(k => !inUse.has(k)), all.filter(k => !nearby.has(k)), all.filter(k => k !== shownRef.current[i])];
      const pool = pools.find(p => p.length > 0) ?? [];
      if (!pool.length) return;
      changedAt.set(i, performance.now());
      setTileImage(i, pool[Math.floor(Math.random() * pool.length)], false);
    };
    const cooling = (i: number) => performance.now() - (changedAt.get(i) ?? -Infinity) < COOLDOWN_MS;
    const walkers: number[][] = Array.from({ length: WALKERS }, () => []);
    const step = (trail: number[]) => {
      if (dragRef.current) return;
      const current = trail[trail.length - 1];
      // No toca la que le pasó el contagio, ni el rastro de otro contagio, ni una que cambió hace poco
      // (de nadie): cada contagio respeta la zona de los otros
      const taken = new Set(walkers.flat());
      const options = current === undefined ? [] : neighbors(current).filter(n => !taken.has(n) && !cooling(n) && isFront(n));
      const next = options.length ? options[Math.floor(Math.random() * options.length)] : randomFront(n => !taken.has(n) && !cooling(n));
      if (next < 0) return;
      if (!options.length) trail.length = 0;
      trail.push(next);
      // Recuerda la actual y las 2 anteriores: no regresa a ellas
      if (trail.length > 3) trail.shift();
      swap(next);
    };
    // Cada contagio con su propio reloj, arrancando desfasado un tercio de segundo del anterior
    const timers: ReturnType<typeof setTimeout>[] = [];
    walkers.forEach((trail, k) => {
      timers.push(setTimeout(() => {
        step(trail);
        timers.push(setInterval(() => step(trail), SWAP_EVERY_MS));
      }, (k * SWAP_EVERY_MS) / WALKERS));
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [shuffle, paused, layout, items, setTileImage]);

  const tileW = layout ? (2 * Math.PI * layout.radius * layout.colStep) / 360 : 0;
  const tileH = layout ? (2 * Math.PI * layout.radius * layout.rowStep) / 360 : 0;

  return (
    <div
      ref={rootRef}
      className="dome"
      style={{
        '--dome-radius': `${layout?.radius ?? 600}px`,
        '--dome-perspective': `${(layout?.radius ?? 600) * PERSPECTIVE_PER_RADIUS}px`,
        '--dome-fade': `${FADE_MS}ms`,
        '--dome-intro': `${INTRO_MS}ms`,
      } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className={`dome__stage ${visible ? 'is-visible' : ''}`}>
        <div ref={sphereRef} className="dome__sphere">
          {layout?.tiles.slice(0, tileBudget).map((_, i) => (
            <div
              key={i}
              ref={el => {
                tileRefs.current[i] = el;
              }}
              className="dome__tile"
              data-tile={i}
              role="button"
              tabIndex={-1}
              style={{
                width: `${tileW}px`,
                height: `${tileH}px`,
                // Centro de la ficha en el centro del globo antes de girarla
                marginLeft: `${-tileW / 2}px`,
                marginTop: `${-tileH / 2}px`,
                // Retraso de entrada "aleatorio" pero fijo por ficha (no cambia entre renders)
                '--dome-delay': `${((i * 7919) % 997) / 997 * INTRO_SPREAD_MS}ms`,
              } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" draggable={false} decoding="async" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" draggable={false} decoding="async" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
