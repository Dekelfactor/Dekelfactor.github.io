/**
 * project.json — the single source of truth.
 *
 * The editor UI writes it, the renderer plays it, and Claude can read and
 * rewrite it from chat. Conventions (keep them human-friendly):
 *   - times are in seconds, angles in degrees, colours are "#rrggbb"
 *   - any animatable property is EITHER a plain value OR
 *     { "keys": [{ "t": seconds, "v": value, "ease": ... }], "wiggle"?: {...} }
 *   - the ease on a key shapes the segment from that key to the next one
 */
import { z } from 'zod';

export const SCHEMA_ID = 'df-motion-studio/project@1';

// ---------- primitives ----------
export const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3>;
export const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #rrggbb colour');

export const EasePreset = z.enum(['linear', 'hold', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'smooth', 'snappy', 'overshoot', 'bounce']);
export const Ease = z.union([
  EasePreset,
  z.object({ bezier: z.tuple([z.number().min(0).max(1), z.number(), z.number().min(0).max(1), z.number()]) }).strict(),
  z.object({
    spring: z.object({
      stiffness: z.number().positive().max(2000).default(170),
      damping: z.number().positive().max(500).default(18),
      mass: z.number().positive().max(50).default(1),
    }).strict(),
  }).strict(),
]);
export type Ease = z.infer<typeof Ease>;

export const Wiggle = z.object({
  amount: z.number().min(0).max(1000),
  frequency: z.number().min(0).max(60).default(1),
  seed: z.number().int().default(1),
}).strict();
export type Wiggle = z.infer<typeof Wiggle>;

function animatable<T extends z.ZodTypeAny>(value: T) {
  const key = z.object({ t: z.number().min(0), v: value, ease: Ease.optional() }).strict();
  const animated = z.object({
    keys: z.array(key).max(2000).default([]),
    /** value used when there are no keys */
    value: value.optional(),
    wiggle: Wiggle.optional(),
  }).strict();
  return z.union([value, animated]);
}
export const ANum = animatable(z.number());
export const AVec3 = animatable(Vec3);
export const AColor = animatable(Color);
export type ANum = z.infer<typeof ANum>;
export type AVec3 = z.infer<typeof AVec3>;
export type AColor = z.infer<typeof AColor>;
export type AnyAnim = ANum | AVec3 | AColor;
export type Keyframe<V> = { t: number; v: V; ease?: Ease };
export type Animated<V> = { keys: Keyframe<V>[]; value?: V; wiggle?: Wiggle };

// ---------- assets ----------
export const Asset = z.object({
  kind: z.enum(['video', 'image', 'model', 'audio']),
  name: z.string().max(200),
  /** https URL, data: URL, or "local:<id>" for files kept in this browser */
  src: z.string().max(50_000_000).refine(s => /^(https:|data:|local:|\/|\.\/)/.test(s), 'Asset src must be https:, data:, local: or a relative path'),
  /** natural aspect (w/h) once known */
  aspect: z.number().positive().optional(),
  duration: z.number().positive().optional(),
}).strict();
export type Asset = z.infer<typeof Asset>;

// ---------- layers ----------
export const Transform = z.object({
  position: AVec3.default([0, 0, 0]),
  rotation: AVec3.default([0, 0, 0]),
  scale: AVec3.default([1, 1, 1]),
  opacity: ANum.default(1),
}).strict();
export type Transform = z.infer<typeof Transform>;

const LayerBase = {
  id: z.string().min(1).max(64),
  name: z.string().max(120),
  start: z.number().min(0).default(0),
  duration: z.number().positive(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  /** keep this layer fully inside the frame's safe area on every frame (use for logos) */
  protect: z.boolean().default(false),
  transform: Transform.default({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 }),
};

export const TextLayer = z.object({
  ...LayerBase,
  type: z.literal('text'),
  text: z.string().max(2000),
  font: z.enum(['newsreader', 'geist', 'geist-mono']).default('geist'),
  size: z.number().positive().max(50).default(0.4),
  color: AColor.default('#ede4d6'),
  align: z.enum(['left', 'center', 'right']).default('center'),
  letterSpacing: z.number().min(-0.2).max(1).default(0),
}).strict();

export const ShapeLayer = z.object({
  ...LayerBase,
  type: z.literal('shape'),
  shape: z.enum(['box', 'roundedBox', 'sphere', 'torus', 'cylinder', 'plane', 'df-monogram']),
  color: AColor.default('#d9cbb4'),
  metalness: z.number().min(0).max(1).default(0.2),
  roughness: z.number().min(0).max(1).default(0.4),
  emissive: ANum.default(0),
}).strict();

export const ModelLayer = z.object({ ...LayerBase, type: z.literal('model'), asset: z.string() }).strict();
export const ImageLayer = z.object({ ...LayerBase, type: z.literal('image'), asset: z.string(), width: z.number().positive().default(3) }).strict();
export const VideoLayer = z.object({
  ...LayerBase, type: z.literal('video'), asset: z.string(), width: z.number().positive().default(3),
  trimStart: z.number().min(0).default(0), volume: ANum.default(1),
}).strict();
export const AudioLayer = z.object({
  ...LayerBase, type: z.literal('audio'), asset: z.string(), trimStart: z.number().min(0).default(0), volume: ANum.default(1),
}).strict();

export const Layer = z.discriminatedUnion('type', [TextLayer, ShapeLayer, ModelLayer, ImageLayer, VideoLayer, AudioLayer]);
export type Layer = z.infer<typeof Layer>;
export type LayerType = Layer['type'];

// ---------- camera, lights, environment, effects ----------
export const Camera = z.object({
  position: AVec3.default([0, 2, 12]),
  target: AVec3.default([0, 1.2, 0]),
  fov: ANum.default(32),
  roll: ANum.default(0),
  dof: z.object({
    enabled: z.boolean().default(false),
    focusDistance: ANum.default(12),
    /** 0 = sharp, 1 = very shallow */
    aperture: ANum.default(0.35),
  }).strict().default({ enabled: false, focusDistance: 12, aperture: 0.35 }),
}).strict();
export type Camera = z.infer<typeof Camera>;

export const Light = z.object({
  enabled: z.boolean().default(true),
  /** degrees around the subject, 0 = in front of it, 90 = camera-right */
  azimuth: ANum,
  /** degrees above the horizon */
  elevation: ANum,
  distance: z.number().positive().default(8),
  intensity: ANum.default(1),
  /** Kelvin, 1800–12000 */
  temperature: ANum.default(5600),
  /** 0 = hard shadows, 1 = very soft */
  softness: ANum.default(0.5),
}).strict();
export type Light = z.infer<typeof Light>;

export const EnvPreset = z.enum(['studio', 'dusk', 'noir', 'daylight', 'none']);
export const Environment = z.object({
  preset: EnvPreset.default('studio'),
  intensity: ANum.default(0.6),
  background: AColor.default('#1d1915'),
  ground: z.object({ enabled: z.boolean().default(true), color: Color.default('#241f1a'), reflectivity: z.number().min(0).max(1).default(0.15) }).strict().default({ enabled: true, color: '#241f1a', reflectivity: 0.15 }),
  backdrop: z.object({ enabled: z.boolean().default(true), color: Color.default('#231e19') }).strict().default({ enabled: true, color: '#231e19' }),
  fog: z.object({ enabled: z.boolean().default(true), color: Color.default('#1d1915'), near: ANum.default(12), far: ANum.default(30) }).strict().default({ enabled: true, color: '#1d1915', near: 12, far: 30 }),
}).strict();
export type Environment = z.infer<typeof Environment>;

export const Effects = z.object({
  bloom: z.object({ enabled: z.boolean().default(true), intensity: ANum.default(0.6), threshold: z.number().min(0).max(1).default(0.8), radius: z.number().min(0).max(1).default(0.6) }).strict().default({ enabled: true, intensity: 0.6, threshold: 0.8, radius: 0.6 }),
  grain: z.object({ enabled: z.boolean().default(true), amount: ANum.default(0.06) }).strict().default({ enabled: true, amount: 0.06 }),
  vignette: z.object({ enabled: z.boolean().default(true), amount: ANum.default(0.45), softness: z.number().min(0).max(1).default(0.5) }).strict().default({ enabled: true, amount: 0.45, softness: 0.5 }),
  grade: z.object({
    exposure: ANum.default(0), contrast: ANum.default(0), saturation: ANum.default(0),
    /** -1 cool … +1 warm */
    temperature: ANum.default(0), tint: ANum.default(0),
  }).strict().default({ exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 }),
  motionBlur: z.object({ enabled: z.boolean().default(false), shutter: z.number().min(0).max(1).default(0.5), samples: z.number().int().min(2).max(16).default(6) }).strict().default({ enabled: false, shutter: 0.5, samples: 6 }),
}).strict();
export type Effects = z.infer<typeof Effects>;

export const Aspect = z.enum(['9:16', '1:1', '16:9']);
export type Aspect = z.infer<typeof Aspect>;

export const Project = z.object({
  $schema: z.literal(SCHEMA_ID).default(SCHEMA_ID),
  name: z.string().min(1).max(120),
  fps: z.number().int().min(12).max(120).default(30),
  duration: z.number().min(0.5).max(600),
  aspect: Aspect.default('9:16'),
  /** fraction of the frame kept clear around protected layers (logos) */
  safeArea: z.number().min(0).max(0.3).default(0.06),
  assets: z.record(z.string(), Asset).default({}),
  layers: z.array(Layer).max(200).default([]),
  camera: Camera,
  lights: z.object({ key: Light, fill: Light, rim: Light }).strict(),
  environment: Environment,
  effects: Effects,
}).strict();
export type Project = z.infer<typeof Project>;
export type ProjectInput = z.input<typeof Project>;

export const ASPECT_SIZE: Record<Aspect, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export type ParseResult = { ok: true; project: Project } | { ok: false; errors: string[] };

/** Validate untrusted JSON (paste, import, autosave). Never throws. */
export function parseProject(input: unknown): ParseResult {
  const r = Project.safeParse(input);
  if (r.success) {
    const p = r.data;
    const ids = new Set<string>();
    const errors: string[] = [];
    for (const l of p.layers) {
      if (ids.has(l.id)) errors.push(`layers: duplicate id "${l.id}"`);
      ids.add(l.id);
      if ('asset' in l && !p.assets[l.asset]) errors.push(`layers.${l.id}.asset: no asset "${l.asset}" in assets`);
    }
    return errors.length ? { ok: false, errors } : { ok: true, project: p };
  }
  return { ok: false, errors: r.error.issues.slice(0, 12).map(i => `${i.path.join('.') || '(root)'}: ${i.message}`) };
}
