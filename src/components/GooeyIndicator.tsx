'use client';

/**
 * GooeyIndicator
 * --------------
 * Animation-only port of React Bits' <GooeyNav /> (WebGL "liquid droplets").
 * It does NOT render any navigation items itself. Instead, it is dropped inside an
 * existing container and animates the active-item indicator between the container's
 * children marked with `data-goo-item`. The active child must carry `data-goo-active="true"`.
 *
 * The indicator colour is taken from the theme's `bg-primary`, and the shape keeps the
 * host's corner radius, so the existing visual style is preserved — only the motion changes.
 *
 * Layering: the canvas sits above the item backgrounds (z-20); item icons should use a
 * higher z-index (e.g. `relative z-30`) so they stay visible above the goo.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const MAX_DROPS = 32;
const MAX_PILLS = 4;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uSize;
uniform float uRatio;
uniform vec4 uPills[${MAX_PILLS}];
uniform vec4 uDrops[${MAX_DROPS}];
uniform vec2 uTails[${MAX_DROPS}];
uniform int uCount;
uniform float uSmooth;
uniform float uRadius;
uniform vec3 uPill;
uniform float uShadow;

out vec4 outColor;

float sdBox(vec2 p, vec4 box) {
  vec2 extent = max(box.zw, vec2(0.0));
  float r = min(uRadius, min(extent.x, extent.y));
  vec2 q = abs(p - box.xy) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float field(vec2 p) {
  float d = 1e5;
  for (int i = 0; i < ${MAX_PILLS}; i++) {
    vec4 pill = uPills[i];
    if (pill.z <= 0.0) continue;
    d = smin(d, sdBox(p, pill), uSmooth);
  }
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uCount) break;
    vec4 drop = uDrops[i];
    if (drop.z <= 0.0) continue;
    float c = sdCapsule(p, drop.xy, drop.xy - uTails[i], drop.z);
    if (c > d + uSmooth) continue;
    d = smin(d, c, uSmooth);
  }
  return d;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio;
  float d = field(p);
  float aa = max(fwidth(d), 0.35);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);

  vec2 grad = vec2(dFdx(d), -dFdy(d));
  vec2 n = length(grad) > 0.0001 ? normalize(grad) : vec2(0.0, 1.0);
  float rim = (1.0 - smoothstep(0.0, 1.6, -d)) * max(0.0, -n.y) * 0.2;
  vec3 fill = mix(uPill, vec3(1.0), rim);

  float lifted = field(p - vec2(0.0, 2.0));
  float shadow = (1.0 - smoothstep(-3.0, 7.0, lifted)) * uShadow * (1.0 - body);

  vec4 color = vec4(0.0, 0.0, 0.0, shadow);
  color = vec4(fill * body, body) + color * (1.0 - body);
  outColor = color;
}
`;

const UNIFORMS = [
    'uSize',
    'uRatio',
    'uPills',
    'uDrops',
    'uTails',
    'uCount',
    'uSmooth',
    'uRadius',
    'uPill',
    'uShadow',
] as const;

type UniformName = (typeof UNIFORMS)[number];

interface Pipeline {
    program: WebGLProgram;
    buffer: WebGLBuffer;
    position: number;
    uniforms: Record<UniformName, WebGLUniformLocation | null>;
}

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
};

const build = (gl: WebGL2RenderingContext): Pipeline | null => {
    const program = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!program || !vs || !fs) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }
    const uniforms = Object.fromEntries(
        UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])
    ) as Pipeline['uniforms'];
    const buffer = gl.createBuffer();
    if (!buffer) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    return { program, uniforms, buffer, position: gl.getAttribLocation(program, 'aPosition') };
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const travelEase = (t: number) => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

const bezier = (a: number, b: number, c: number, d: number, t: number) => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/** Resolve the theme's `bg-primary` (may be oklch) into linear 0..1 RGB. */
const readPrimary = (host: HTMLElement): [number, number, number] => {
    const probe = document.createElement('span');
    probe.className = 'bg-primary';
    probe.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
    host.appendChild(probe);
    const css = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return [0, 0.4, 0.5];
    const c = ctx.canvas;
    c.width = c.height = 1;
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
};

interface Rect { x: number; y: number; w: number; h: number }
interface PillState { mass: number; scale: number; velocity: number; outgoing: number }
interface Drop {
    x: number; y: number; vx: number; vy: number;
    mass: number; size: number; given: number;
    source: number; index: number; leave: number;
    emerged: number; absorbed: number;
    state: 'waiting' | 'flying' | 'absorbing';
    start: number; duration: number; path: number[];
}

export interface GooeyIndicatorProps {
    /** The element that contains the `[data-goo-item]` children. */
    containerRef: React.RefObject<HTMLElement | null>;
    /** Called once with whether WebGL2 is available (use it to fall back to a static active style). */
    onSupportChange?: (supported: boolean) => void;
    animationTime?: number;
    particleCount?: number;
    spread?: number;
    timeVariance?: number;
    gooeyness?: number;
    wobble?: number;
    /** Corner radius of the indicator in px (matches `rounded-xl` by default). */
    radius?: number;
    shadow?: number;
}

export default function GooeyIndicator({
    containerRef,
    onSupportChange,
    animationTime = 600,
    particleCount = 12,
    spread = 18,
    timeVariance = 250,
    gooeyness = 0.5,
    wobble = 0.5,
    radius = 12,
    shadow = 0.18,
}: GooeyIndicatorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<{ sync: () => void } | null>(null);
    const settingsRef = useRef({ animationTime, particleCount, spread, timeVariance, gooeyness, wobble, radius, shadow });
    settingsRef.current = { animationTime, particleCount, spread, timeVariance, gooeyness, wobble, radius, shadow };
    const supportRef = useRef(onSupportChange);
    supportRef.current = onSupportChange;

    useIsomorphicLayoutEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
        const pipeline = gl ? build(gl) : null;
        supportRef.current?.(!!pipeline);
        if (!gl || !pipeline) {
            canvas.style.display = 'none';
            return;
        }

        const view = { width: 0, height: 0 };
        const offset = { x: 0, y: 0 };
        let items: HTMLElement[] = [];
        let rects: Rect[] = [];
        let target = -1;
        let pillRgb = readPrimary(container);
        const pills = new Map<number, PillState>();
        const drops: Drop[] = [];
        const pillData = new Float32Array(MAX_PILLS * 4);
        const dropData = new Float32Array(MAX_DROPS * 4);
        const tailData = new Float32Array(MAX_DROPS * 2);
        let raf = 0;
        let last = 0;
        let disposed = false;

        const measure = () => {
            const box = container.getBoundingClientRect();
            const vx = box.left + container.clientLeft;
            const vy = box.top + container.clientTop;
            view.width = container.clientWidth;
            view.height = container.clientHeight;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.style.width = `${view.width}px`;
            canvas.style.height = `${view.height}px`;
            // Pin the canvas to the visible padding box, regardless of scroll / RTL.
            const current = canvas.getBoundingClientRect();
            offset.x += vx - current.left;
            offset.y += vy - current.top;
            canvas.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
            const width = Math.max(1, Math.round(view.width * ratio));
            const height = Math.max(1, Math.round(view.height * ratio));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            items = Array.from(container.querySelectorAll<HTMLElement>('[data-goo-item]'));
            rects = items.map((el) => {
                const r = el.getBoundingClientRect();
                return { x: r.left - vx, y: r.top - vy, w: r.width, h: r.height };
            });
        };

        const activeIndex = () => items.findIndex((el) => el.dataset.gooActive === 'true');

        const pill = (index: number) => {
            let state = pills.get(index);
            if (!state) {
                state = { mass: 0, scale: 0, velocity: 0, outgoing: 0 };
                pills.set(index, state);
            }
            return state;
        };

        const shape = (index: number, amount: number) => {
            const rect = rects[index];
            if (!rect || amount <= 0.002) return null;
            const k = Math.min(1.08, 0.42 + 0.58 * Math.sqrt(Math.max(0, amount)));
            const h = rect.h * k;
            const w = rect.w * k;
            return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, hw: w / 2, hh: h / 2 };
        };

        const plan = (drop: Drop, index: number, now: number, fresh: boolean) => {
            const s = settingsRef.current;
            const rect = rects[index];
            if (!rect) return;
            const reach = Math.max(0, s.spread);
            const ex = rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.3;
            const ey = rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.3;
            const base = Math.max(0.15, s.animationTime / 1000);
            const variance = (Math.random() - 0.5) * (Math.max(0, s.timeVariance) / 1000);
            const duration = Math.max(0.15, base * (0.62 + Math.random() * 0.32) + variance * 0.6);
            const out = Math.random() * Math.PI * 2;
            const into = Math.random() * Math.PI * 2;
            const burst = reach * (0.7 + Math.random() * 0.6);
            const swing = reach * (0.55 + Math.random() * 0.55);
            const carry = Math.min(duration / 3, 0.12);
            drop.index = index;
            drop.start = now;
            drop.duration = duration;
            drop.path = [
                drop.x,
                drop.y,
                fresh ? drop.x + Math.cos(out) * burst * 1.6 : drop.x + drop.vx * carry,
                fresh ? drop.y + Math.sin(out) * burst * 1.6 : drop.y + drop.vy * carry,
                ex + Math.cos(into) * swing * 1.5,
                ey + Math.sin(into) * swing * 1.5,
                ex,
                ey,
            ];
        };

        const emit = (from: number, to: number, now: number) => {
            const s = settingsRef.current;
            const source = pills.get(from);
            const rect = rects[from];
            if (!source || !rect || !rects[to]) return;
            const available = source.mass - source.outgoing;
            if (available <= 0.002) return;
            const room = MAX_DROPS - drops.length;
            const count = Math.min(room, Math.max(1, Math.round(Math.max(1, s.particleCount) * available)));
            if (count <= 0) return;
            const spreadWindow = Math.max(0.15, s.animationTime / 1000) * 0.16;
            for (let i = 0; i < count; i++) {
                const mass = available / count;
                source.outgoing += mass;
                drops.push({
                    x: rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.5,
                    y: rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.5,
                    vx: 0, vy: 0, mass,
                    size: 0.8 + Math.random() * 0.4,
                    given: 0, source: from, index: to,
                    leave: now + Math.random() * spreadWindow * 1000,
                    emerged: 0, absorbed: 0, state: 'waiting',
                    start: now, duration: 0, path: [],
                });
            }
        };

        const render = () => {
            const s = settingsRef.current;
            const height = rects[target]?.h ?? rects[0]?.h ?? 40;
            const smooth = height * (0.18 + 0.5 * clamp01(s.gooeyness));

            let slot = 0;
            for (const [index, state] of pills) {
                if (slot >= MAX_PILLS) break;
                const box = shape(index, state.scale);
                if (!box) continue;
                pillData[slot * 4] = box.cx;
                pillData[slot * 4 + 1] = box.cy;
                pillData[slot * 4 + 2] = box.hw;
                pillData[slot * 4 + 3] = box.hh;
                slot += 1;
            }
            pillData.fill(0, slot * 4);

            let count = 0;
            for (const drop of drops) {
                if (count >= MAX_DROPS) break;
                if (drop.state === 'waiting') continue;
                const r = 0.26 * height * drop.size * Math.min(drop.emerged, 1 - drop.absorbed);
                if (r <= 0.05) continue;
                const speed = Math.hypot(drop.vx, drop.vy);
                const length = Math.min(r * 1.1, speed * 0.018);
                dropData[count * 4] = drop.x;
                dropData[count * 4 + 1] = drop.y;
                dropData[count * 4 + 2] = r;
                dropData[count * 4 + 3] = 0;
                tailData[count * 2] = speed > 0.01 ? (drop.vx / speed) * length : 0;
                tailData[count * 2 + 1] = speed > 0.01 ? (drop.vy / speed) * length : 0;
                count += 1;
            }

            const { program, uniforms, buffer, position } = pipeline;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
            gl.uniform2f(uniforms.uSize, view.width, view.height);
            gl.uniform1f(uniforms.uRatio, canvas.width / Math.max(1, view.width));
            gl.uniform4fv(uniforms.uPills, pillData);
            gl.uniform4fv(uniforms.uDrops, dropData);
            gl.uniform2fv(uniforms.uTails, tailData);
            gl.uniform1i(uniforms.uCount, count);
            gl.uniform1f(uniforms.uSmooth, smooth);
            gl.uniform1f(uniforms.uRadius, s.radius);
            gl.uniform3f(uniforms.uPill, pillRgb[0], pillRgb[1], pillRgb[2]);
            gl.uniform1f(uniforms.uShadow, s.shadow);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };

        const frame = (now: number) => {
            raf = 0;
            const s = settingsRef.current;
            const dt = Math.min(0.05, (now - last) / 1000 || 0);
            last = now;
            const emergeTime = 0.09;
            const absorbTime = 0.12;

            for (let i = drops.length - 1; i >= 0; i--) {
                const drop = drops[i];
                if (drop.state === 'waiting') {
                    if (now < drop.leave) continue;
                    drop.state = 'flying';
                    plan(drop, drop.index, now, true);
                }
                if (drop.state === 'flying') {
                    drop.emerged = Math.min(1, drop.emerged + dt / emergeTime);
                    const source = pills.get(drop.source);
                    if (source && drop.given < drop.mass) {
                        const step = Math.min(drop.mass * (dt / emergeTime), drop.mass - drop.given);
                        source.mass = Math.max(0, source.mass - step);
                        source.outgoing = Math.max(0, source.outgoing - step);
                        drop.given += step;
                    }
                    const t = clamp01((now - drop.start) / 1000 / drop.duration);
                    const eased = travelEase(t);
                    const [x0, y0, x1, y1, x2, y2, x3, y3] = drop.path;
                    const x = bezier(x0, x1, x2, x3, eased);
                    const y = bezier(y0, y1, y2, y3, eased);
                    if (dt > 0) {
                        drop.vx = (x - drop.x) / dt;
                        drop.vy = (y - drop.y) / dt;
                    }
                    drop.x = x;
                    drop.y = y;
                    if (t >= 1) drop.state = 'absorbing';
                }
                if (drop.state === 'absorbing') {
                    const step = Math.min(1 - drop.absorbed, dt / absorbTime);
                    drop.absorbed += step;
                    drop.vx *= 0.8;
                    drop.vy *= 0.8;
                    const host = pill(drop.index);
                    host.mass = Math.min(1, host.mass + drop.mass * step);
                    if (drop.absorbed >= 1) drops.splice(i, 1);
                }
            }

            const zeta = reduced ? 1 : 1 - 0.72 * clamp01(s.wobble);
            const omega = 26;
            const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
            const h = dt / steps;
            for (const [index, state] of pills) {
                for (let n = 0; n < steps; n++) {
                    state.velocity += (omega * omega * (state.mass - state.scale) - 2 * zeta * omega * state.velocity) * h;
                    state.scale += state.velocity * h;
                }
                if (index !== target && state.mass <= 0.002 && state.outgoing <= 0.002 && Math.abs(state.scale) < 0.004) {
                    pills.delete(index);
                }
            }

            render();

            const host = pills.get(target);
            const resting =
                drops.length === 0 &&
                pills.size === 1 &&
                !!host &&
                Math.abs(host.mass - host.scale) < 0.0008 &&
                Math.abs(host.velocity) < 0.004;
            if (!resting) raf = requestAnimationFrame(frame);
            else if (host) {
                host.mass = 1;
                host.scale = 1;
                host.velocity = 0;
                render();
            }
        };

        const wake = () => {
            if (raf || disposed) return;
            last = performance.now();
            raf = requestAnimationFrame(frame);
        };

        const settle = (index: number) => {
            cancelAnimationFrame(raf);
            raf = 0;
            pills.clear();
            drops.length = 0;
            target = index;
            if (index >= 0) {
                const state = pill(index);
                state.mass = 1;
                state.scale = 1;
                state.velocity = 0;
            }
            render();
        };

        const go = (index: number) => {
            if (index === target) return;
            if (index < 0 || target < 0 || !rects[index] || reduced) {
                settle(index);
                return;
            }
            const now = performance.now();
            target = index;
            pill(index);
            for (const drop of drops) {
                drop.index = index;
                if (drop.state === 'flying') plan(drop, index, now, false);
                if (drop.state === 'absorbing') {
                    drop.state = 'flying';
                    drop.mass *= 1 - drop.absorbed;
                    drop.absorbed = 0;
                    plan(drop, index, now, false);
                }
            }
            for (const from of [...pills.keys()]) {
                if (from !== index) emit(from, index, now);
            }
            wake();
        };

        const sync = () => {
            const previousCount = items.length;
            measure();
            const index = activeIndex();
            if (items.length !== previousCount) settle(index);
            else go(index);
        };

        const onLayout = () => {
            measure();
            if (!drops.length) settle(activeIndex());
            else render();
        };

        const resizeObserver = new ResizeObserver(onLayout);
        resizeObserver.observe(container);
        const themeObserver = new MutationObserver(() => {
            pillRgb = readPrimary(container);
            render();
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        container.addEventListener('scroll', onLayout, { passive: true });
        window.addEventListener('resize', onLayout);

        measure();
        settle(activeIndex());
        engineRef.current = { sync };

        return () => {
            disposed = true;
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            themeObserver.disconnect();
            container.removeEventListener('scroll', onLayout);
            window.removeEventListener('resize', onLayout);
            gl.deleteBuffer(pipeline.buffer);
            gl.deleteProgram(pipeline.program);
            engineRef.current = null;
        };
    }, [containerRef]);

    // Re-sync after every parent render (active item / item list may have changed).
    useIsomorphicLayoutEffect(() => {
        engineRef.current?.sync();
    });

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-20"
        />
    );
}
