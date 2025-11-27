"use client";

import { useEffect, useRef } from "react";

export interface NoiseProps {
    patternSize?: number;
    patternScaleX?: number;
    patternScaleY?: number;
    patternAlpha?: number;
}

export default function Noise({
    patternSize = 250,
    patternScaleX = 1,
    patternScaleY = 1,
    patternAlpha = 15,
}: NoiseProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const patternCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        // Create pattern canvas
        const patternCanvas = document.createElement("canvas");
        const patternCtx = patternCanvas.getContext("2d", { alpha: true });
        if (!patternCtx) return;

        patternCanvasRef.current = patternCanvas;
        patternCanvas.width = patternSize;
        patternCanvas.height = patternSize;

        let needsResize = false;

        const performResize = () => {
            const dpr = window.devicePixelRatio || 1;
            // Use clientWidth/Height to match the CSS size (which fills the parent)
            const w = canvas.clientWidth || 1;
            const h = canvas.clientHeight || 1;

            if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                canvas.width = w * dpr;
                canvas.height = h * dpr;
                ctx.scale(dpr, dpr);
            }
        };

        const createPattern = () => {
            const imageData = patternCtx.createImageData(patternSize, patternSize);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const value = Math.random() * 255;
                data[i] = value;     // R
                data[i + 1] = value; // G
                data[i + 2] = value; // B
                data[i + 3] = patternAlpha; // Alpha
            }

            patternCtx.putImageData(imageData, 0, 0);
        };

        const draw = () => {
            if (!canvas || !ctx) return;

            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            if (patternCanvasRef.current) {
                const pattern = ctx.createPattern(patternCanvasRef.current, "repeat");
                if (pattern) {
                    ctx.save();
                    ctx.scale(patternScaleX, patternScaleY);
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, w / patternScaleX, h / patternScaleY);
                    ctx.restore();
                }
            }
        };

        // Initialize
        performResize();
        createPattern();
        draw();

        // Animation loop
        const animate = () => {
            // Only redraw if not resized in this frame (to avoid double work)
            if (!needsResize) {
                createPattern();
                draw();
            }
            needsResize = false;
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        const handleResize = (entries?: any) => {
            needsResize = true;

            // If we have entries (ResizeObserver), use them for efficiency
            if (entries && Array.isArray(entries) && entries[0] instanceof ResizeObserverEntry) {
                const entry = entries[0];
                const dpr = window.devicePixelRatio || 1;

                // Get size from entry
                let width, height;
                if (entry.contentBoxSize) {
                    // contentBoxSize is an array in newer specs
                    const size = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
                    width = size.inlineSize;
                    height = size.blockSize;
                } else {
                    width = entry.contentRect.width;
                    height = entry.contentRect.height;
                }

                // Update canvas resolution immediately
                if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
                    canvas.width = width * dpr;
                    canvas.height = height * dpr;
                    ctx.scale(dpr, dpr);

                    // Redraw immediately to fill the new space
                    createPattern();
                    draw();
                }
            } else {
                // Fallback or window resize event
                performResize();
                createPattern();
                draw();
            }
        };

        // Use ResizeObserver for robust size tracking
        let resizeObserver: ResizeObserver | null = null;
        if ('ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(canvas);
        } else {
            (window as Window).addEventListener("resize", handleResize);
        }

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                (window as Window).removeEventListener("resize", handleResize);
            }
        };
    }, [patternSize, patternScaleX, patternScaleY, patternAlpha]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 9999,
            }}
        />
    );
}
