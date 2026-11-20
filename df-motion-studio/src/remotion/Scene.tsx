import React, { createRef, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Environment as DreiEnvironment, Lightformer, Text, useGLTF, useTexture } from '@react-three/drei';
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ThreeCanvas, useOffthreadVideoTexture, useVideoTexture } from '@remotion/three';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { Audio } from '@remotion/media';
import { AbsoluteFill, Html5Video, Sequence, useCurrentFrame, useDelayRender, useVideoConfig, getRemotionEnvironment } from 'remotion';
import { reportBounds } from '../engine/bounds';
import type { Camera, Effects, Environment, Layer, Light, Project, Transform, Vec3 } from '../schema/project';
import { valueAt } from '../engine/evaluate';
import { getMonogram, getShapeGeometry } from './geometry';
import { kelvinToColor } from './color';
import { GradeEffect, GrainEffect } from './effects';
import { resolveAsset } from './assets';
import newsreaderWoff from '@fontsource/newsreader/files/newsreader-latin-400-normal.woff';
import geistWoff from '@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff';
import geistMonoWoff from '@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff';

export type Quality = 'draft' | 'full';
export type CompositionProps = {
  project: Project;
  quality?: Quality;
  /** device pixel ratio for the WebGL canvas (the app passes a capped, preview-scaled value) */
  dpr?: number;
  /** id of the selected layer, highlighted in the editor preview only */
  selectedId?: string | null;
};

const FONTS = { newsreader: newsreaderWoff, geist: geistWoff, 'geist-mono': geistMonoWoff } as const;
const DEG = Math.PI / 180;

export const StudioComposition: React.FC<CompositionProps> = ({ project, quality = 'full', dpr }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const rendering = getRemotionEnvironment().isRendering;
  const draft = quality === 'draft' && !rendering;
  const bg = valueAt(project.environment.background, t);
  const videoIds = project.layers.filter(l => l.type === 'video').map(l => l.id).join('|');
  const videoRefs = useMemo(() => Object.fromEntries(videoIds.split('|').filter(Boolean).map(id => [id, createRef<HTMLVideoElement>()])), [videoIds]);
  const mb = project.effects.motionBlur;
  const blur = rendering && mb.enabled;

  const canvas = (
      <ThreeCanvas
        width={width}
        height={height}
        dpr={rendering ? 1 : dpr ?? 1}
        shadows={draft ? false : { type: THREE.PCFShadowMap }}
        frameloop="demand"
        gl={{ antialias: !draft, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace, powerPreference: 'high-performance', preserveDrawingBuffer: rendering }}
        camera={{ fov: 35, near: 0.1, far: 300, position: [0, 2, 12] }}
      >
        <SceneContent project={project} t={t} frame={frame} draft={draft} videoRefs={videoRefs} rendering={rendering} />
      </ThreeCanvas>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {blur ? <CameraMotionBlur shutterAngle={mb.shutter * 360} samples={mb.samples}>{canvas}</CameraMotionBlur> : canvas}
      {/* preview only: hidden, Remotion-synced <video> elements feed the 3D video textures */}
      {rendering ? null : project.layers.map(l => {
        if (l.type !== 'video') return null;
        const src = resolveAsset(project, l.asset);
        if (!src) return null;
        return (
          <Sequence key={l.id} from={Math.round(l.start * fps)} durationInFrames={Math.max(1, Math.round(l.duration * fps))} layout="none">
            <Html5Video ref={videoRefs[l.id]} src={src} trimBefore={Math.round(l.trimStart * fps) || undefined} muted={!l.visible}
              volume={f => valueAt(l.volume, l.start + f / fps)} style={{ position: 'absolute', width: 2, height: 2, opacity: 0, pointerEvents: 'none' }} />
          </Sequence>
        );
      })}
      {project.layers.map(l => (l.type === 'audio' || (l.type === 'video' && rendering)) && l.visible ? <LayerAudio key={l.id} project={project} layer={l} fps={fps} /> : null)}
    </AbsoluteFill>
  );
};

const LayerAudio: React.FC<{ project: Project; layer: Extract<Layer, { type: 'audio' | 'video' }>; fps: number }> = ({ project, layer, fps }) => {
  const src = resolveAsset(project, layer.asset);
  if (!src) return null;
  return (
    <Sequence from={Math.round(layer.start * fps)} durationInFrames={Math.max(1, Math.round(layer.duration * fps))} layout="none">
      <Audio src={src} trimBefore={Math.round(layer.trimStart * fps)} volume={f => valueAt(layer.volume, layer.start + f / fps)} />
    </Sequence>
  );
};

// ---------------------------------------------------------------- scene

type VideoRefs = Record<string, React.RefObject<HTMLVideoElement | null>>;
const SceneContent: React.FC<{ project: Project; t: number; frame: number; draft: boolean; videoRefs: VideoRefs; rendering: boolean }> = ({ project, t, frame, draft, videoRefs, rendering }) => {
  const env = project.environment;
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => { invalidate(); });
  const target = valueAt(project.camera.target, t);
  return (
    <>
      <color attach="background" args={[valueAt(env.background, t)]} />
      {env.fog.enabled ? <fog attach="fog" args={[env.fog.color, valueAt(env.fog.near, t), valueAt(env.fog.far, t)]} /> : null}
      <CameraRig camera={project.camera} t={t} />
      <StudioEnvironment env={env} t={t} />
      <hemisphereLight args={['#8a7f72', '#16130f', 0.18]} />
      <StudioLight light={project.lights.key} t={t} target={target} castShadow={!draft} />
      <StudioLight light={project.lights.fill} t={t} target={target} castShadow={false} />
      <StudioLight light={project.lights.rim} t={t} target={target} castShadow={false} />
      <Stage env={env} />
      {project.layers.map(l => <LayerNode key={l.id} project={project} layer={l} t={t} videoRef={videoRefs[l.id]} rendering={rendering} />)}
      {draft ? null : <PostFX effects={project.effects} camera={project.camera} t={t} frame={frame} />}
    </>
  );
};

function CameraRig({ camera, t }: { camera: Camera; t: number }) {
  const cam = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const pos = valueAt(camera.position, t), tgt = valueAt(camera.target, t);
  const fov = valueAt(camera.fov, t), roll = valueAt(camera.roll, t);
  useLayoutEffect(() => {
    cam.position.set(pos[0], pos[1], pos[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(tgt[0], tgt[1], tgt[2]);
    if (roll) cam.rotateZ(roll * DEG);
    cam.fov = Math.min(120, Math.max(5, fov));
    cam.updateProjectionMatrix();
  });
  return null;
}

/** Light position from azimuth/elevation around the subject (the camera target). */
export function lightPosition(light: Light, t: number, target: Vec3): Vec3 {
  const az = valueAt(light.azimuth, t) * DEG, el = valueAt(light.elevation, t) * DEG, d = light.distance;
  return [target[0] + d * Math.cos(el) * Math.sin(az), target[1] + d * Math.sin(el), target[2] + d * Math.cos(el) * Math.cos(az)];
}

function StudioLight({ light, t, target, castShadow }: { light: Light; t: number; target: Vec3; castShadow: boolean }) {
  const tgt = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  if (!light.enabled) return null;
  const p = lightPosition(light, t, target);
  const softness = THREE.MathUtils.clamp(valueAt(light.softness, t), 0, 1);
  kelvinToColor(valueAt(light.temperature, t), color);
  const intensity = Math.max(0, valueAt(light.intensity, t)) * 95 * (light.distance / 8) ** 1.6;
  return (
    <>
      <primitive object={tgt} position={target} />
      <spotLight
        position={p}
        target={tgt}
        color={color}
        intensity={intensity}
        angle={0.35 + softness * 0.35}
        penumbra={0.2 + softness * 0.8}
        decay={1.6}
        distance={0}
        castShadow={castShadow}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={2 + softness * 10}
      />
    </>
  );
}

function StudioEnvironment({ env, t }: { env: Environment; t: number }) {
  const scene = useThree(s => s.scene);
  const intensity = valueAt(env.intensity, t);
  useLayoutEffect(() => { scene.environmentIntensity = intensity; }, [scene, intensity]);
  if (env.preset === 'none') return null;
  return (
    <DreiEnvironment key={env.preset} resolution={256} frames={1} background={false}>
      <EnvFormers preset={env.preset} />
    </DreiEnvironment>
  );
}

/** Procedural "HDRI" presets built from light formers: no downloads, identical on every machine. */
function EnvFormers({ preset }: { preset: Environment['preset'] }) {
  switch (preset) {
    case 'dusk':
      return (<>
        <color attach="background" args={['#2a1d22']} />
        <Lightformer form="ring" intensity={2.2} color="#ff9a6b" scale={20} position={[0, -2, -12]} />
        <Lightformer intensity={1.2} color="#7f95ff" scale={[30, 8, 1]} position={[0, 10, 0]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.8} color="#ffb58a" scale={[6, 2, 1]} position={[-8, 2, 4]} rotation-y={Math.PI / 3} />
      </>);
    case 'noir':
      return (<>
        <color attach="background" args={['#0f0e0d']} />
        <Lightformer intensity={4} color="#fff1de" scale={[2, 14, 1]} position={[0, 8, 0]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.6} color="#fff1de" scale={[1, 6, 1]} position={[-9, 2, 0]} rotation-y={Math.PI / 2} />
      </>);
    case 'daylight':
      return (<>
        <color attach="background" args={['#a9b4c4']} />
        <Lightformer form="circle" intensity={6} color="#fff4e6" scale={4} position={[6, 10, 6]} />
        <Lightformer intensity={1.6} color="#dfe8ff" scale={[40, 40, 1]} position={[0, 14, 0]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.8} color="#cdbca6" scale={[40, 6, 1]} position={[0, -3, -14]} />
      </>);
    case 'studio':
    default:
      return (<>
        <color attach="background" args={['#1a1714']} />
        <Lightformer intensity={2.6} color="#ffe2c2" scale={[10, 6, 1]} position={[0, 7, 3]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.4} color="#ffd9b0" scale={[2, 9, 1]} position={[-7, 2, 1]} rotation-y={Math.PI / 2} />
        <Lightformer intensity={1.1} color="#e9eeff" scale={[2, 9, 1]} position={[7, 2, -1]} rotation-y={-Math.PI / 2} />
        <Lightformer intensity={0.5} color="#ffffff" scale={[12, 3, 1]} position={[0, 1, -9]} />
        <Lightformer intensity={1.3} color="#fff0de" scale={[14, 5, 1]} position={[2, 3, 12]} rotation-y={Math.PI} />
      </>);
  }
}

function Stage({ env }: { env: Environment }) {
  const g = env.ground;
  return (
    <>
      {g.enabled ? (
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color={g.color} roughness={1 - g.reflectivity * 0.75} metalness={0} envMapIntensity={g.reflectivity * 2} />
        </mesh>
      ) : null}
      {env.backdrop.enabled ? (
        <mesh position={[0, 7, -7]} rotation-z={Math.PI / 2} receiveShadow>
          <cylinderGeometry args={[7, 7, 60, 64, 1, true, Math.PI, Math.PI / 2]} />
          <meshStandardMaterial color={env.backdrop.color} roughness={0.95} side={THREE.BackSide} />
        </mesh>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- layers

export function isLayerActive(layer: Layer, t: number) {
  return layer.visible && t >= layer.start && t < layer.start + layer.duration;
}

export function evalTransform(tr: Transform, t: number) {
  const r = valueAt(tr.rotation, t);
  return {
    position: valueAt(tr.position, t),
    rotation: [r[0] * DEG, r[1] * DEG, r[2] * DEG] as Vec3,
    scale: valueAt(tr.scale, t),
    opacity: THREE.MathUtils.clamp(valueAt(tr.opacity, t), 0, 1),
  };
}

const LayerNode: React.FC<{ project: Project; layer: Layer; t: number; videoRef?: React.RefObject<HTMLVideoElement | null>; rendering: boolean }> = ({ project, layer, t, videoRef, rendering }) => {
  if (layer.type === 'audio') return null;
  const active = isLayerActive(layer, t);
  const tr = evalTransform(layer.transform, t);
  return (
    <group visible={active && tr.opacity > 0.001} position={tr.position} rotation={tr.rotation} scale={tr.scale} name={layer.id}>
      <Suspense fallback={null}>
        <LayerBody project={project} layer={layer} t={t} opacity={tr.opacity} videoRef={videoRef} rendering={rendering} />
      </Suspense>
    </group>
  );
};

function LayerBody({ project, layer, t, opacity, videoRef, rendering }: { project: Project; layer: Exclude<Layer, { type: 'audio' }>; t: number; opacity: number; videoRef?: React.RefObject<HTMLVideoElement | null>; rendering: boolean }) {
  switch (layer.type) {
    case 'shape': return <ShapeBody layer={layer} t={t} opacity={opacity} />;
    case 'text': return <TextBody layer={layer} t={t} opacity={opacity} />;
    case 'model': { const url = resolveAsset(project, layer.asset); return url ? <ModelBody id={layer.id} url={url} opacity={opacity} /> : null; }
    case 'image': { const url = resolveAsset(project, layer.asset); return url ? <ImageBody url={url} width={layer.width} opacity={opacity} /> : null; }
    case 'video': {
      const url = resolveAsset(project, layer.asset);
      const aspect = project.assets[layer.asset]?.aspect ?? 16 / 9;
      if (!url) return <VideoPlane tex={null} width={layer.width} aspect={aspect} opacity={opacity} />;
      if (rendering) return (
        <Sequence from={Math.round((layer.start - layer.trimStart) * project.fps)} layout="none">
          <OffthreadVideoBody src={url} width={layer.width} aspect={aspect} opacity={opacity} />
        </Sequence>
      );
      return videoRef ? <PreviewVideoBody videoRef={videoRef} width={layer.width} aspect={aspect} opacity={opacity} /> : null;
    }
  }
}

function ShapeBody({ layer, t, opacity }: { layer: Extract<Layer, { type: 'shape' }>; t: number; opacity: number }) {
  const color = valueAt(layer.color, t);
  const emissive = valueAt(layer.emissive, t);
  const transparent = opacity < 0.999;
  if (layer.shape === 'df-monogram') {
    const { d, f } = getMonogram();
    const dark = new THREE.Color(color).lerp(new THREE.Color('#2a2520'), 0.85);
    return (
      <group>
        <mesh geometry={d} castShadow receiveShadow>
          <meshPhysicalMaterial color={color} metalness={layer.metalness} roughness={layer.roughness} clearcoat={0.6} clearcoatRoughness={0.15} emissive={color} emissiveIntensity={emissive} transparent={transparent} opacity={opacity} />
        </mesh>
        <mesh geometry={f} castShadow receiveShadow>
          <meshPhysicalMaterial color={dark} metalness={0.2} roughness={0.35} clearcoat={1} clearcoatRoughness={0.08} transparent={transparent} opacity={opacity} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh geometry={getShapeGeometry(layer.shape)} castShadow receiveShadow>
      <meshPhysicalMaterial color={color} metalness={layer.metalness} roughness={layer.roughness} clearcoat={0.4} emissive={color} emissiveIntensity={emissive} transparent={transparent} opacity={opacity} side={layer.shape === 'plane' ? THREE.DoubleSide : THREE.FrontSide} />
    </mesh>
  );
}

function TextBody({ layer, t, opacity }: { layer: Extract<Layer, { type: 'text' }>; t: number; opacity: number }) {
  const { delayRender, continueRender } = useDelayRender();
  const handle = useRef<number | null>(null);
  // hold the render until troika has laid out the glyphs (fonts load async)
  useLayoutEffect(() => {
    const h = delayRender(`Laying out text "${layer.text.slice(0, 24)}"`);
    handle.current = h;
    return () => { if (handle.current !== null) { continueRender(handle.current); handle.current = null; } };
  }, [layer.text, layer.font, layer.size, layer.letterSpacing, delayRender, continueRender]);
  const onSync = (troika: { textRenderInfo?: { blockBounds?: number[] } }) => {
    const bb = troika?.textRenderInfo?.blockBounds;
    if (bb && bb.length === 4) reportBounds(layer.id, [bb[0], bb[1], 0, bb[2], bb[3], 0]);
    if (handle.current !== null) { continueRender(handle.current); handle.current = null; }
  };
  return (
    <Text
      font={FONTS[layer.font]}
      fontSize={layer.size}
      letterSpacing={layer.letterSpacing}
      textAlign={layer.align}
      anchorX={layer.align === 'left' ? 'left' : layer.align === 'right' ? 'right' : 'center'}
      anchorY="middle"
      maxWidth={12}
      color={valueAt(layer.color, t)}
      fillOpacity={opacity}
      onSync={onSync}
      castShadow
    >
      {layer.text}
    </Text>
  );
}

function ModelBody({ id, url, opacity }: { id: string; url: string; opacity: number }) {
  const gltf = useGLTF(url, './draco/');
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    const b = new THREE.Box3().setFromObject(s);
    if (!b.isEmpty()) reportBounds(id, [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]);
    s.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = m.receiveShadow = true;
        m.material = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone();
      }
    });
    return s;
  }, [gltf, id]);
  useLayoutEffect(() => {
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) { mat.transparent = opacity < 0.999; mat.opacity = opacity; }
    });
  }, [scene, opacity]);
  return <primitive object={scene} />;
}

function ImageBody({ url, width, opacity }: { url: string; width: number; opacity: number }) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 1;
  return (
    <mesh castShadow>
      <planeGeometry args={[width, width / aspect]} />
      <meshStandardMaterial map={tex} transparent opacity={opacity} roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PreviewVideoBody({ videoRef, ...rest }: { videoRef: React.RefObject<HTMLVideoElement | null>; width: number; aspect: number; opacity: number }) {
  const tex = useVideoTexture(videoRef);
  return <VideoPlane tex={tex} {...rest} />;
}
function OffthreadVideoBody({ src, ...rest }: { src: string; width: number; aspect: number; opacity: number }) {
  const tex = useOffthreadVideoTexture({ src });
  return <VideoPlane tex={tex} {...rest} />;
}
function VideoPlane({ tex, width, aspect, opacity }: { tex: THREE.Texture | null; width: number; aspect: number; opacity: number }) {
  if (tex) tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh>
      <planeGeometry args={[width, width / aspect]} />
      {tex ? <meshBasicMaterial map={tex} toneMapped={false} transparent={opacity < 0.999} opacity={opacity} side={THREE.DoubleSide} />
        : <meshStandardMaterial color="#332d26" transparent opacity={opacity} />}
    </mesh>
  );
}

// ---------------------------------------------------------------- post

function PostFX({ effects, camera, t, frame }: { effects: Effects; camera: Camera; t: number; frame: number }) {
  const grade = useMemo(() => new GradeEffect(), []);
  const grain = useMemo(() => new GrainEffect(), []);
  const g = effects.grade;
  grade.set({ exposure: valueAt(g.exposure, t), contrast: valueAt(g.contrast, t), saturation: valueAt(g.saturation, t), temperature: valueAt(g.temperature, t), tint: valueAt(g.tint, t) });
  grain.set(effects.grain.enabled ? valueAt(effects.grain.amount, t) : 0, frame);
  const dof = camera.dof;
  const vig = effects.vignette;
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      {dof.enabled ? <DepthOfField worldFocusDistance={valueAt(dof.focusDistance, t)} worldFocusRange={Math.max(0.5, 8 * (1 - valueAt(dof.aperture, t)))} bokehScale={1 + valueAt(dof.aperture, t) * 7} /> : <></>}
      {effects.bloom.enabled ? <Bloom mipmapBlur intensity={valueAt(effects.bloom.intensity, t)} luminanceThreshold={effects.bloom.threshold} luminanceSmoothing={0.2} radius={effects.bloom.radius} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <primitive object={grade} />
      {vig.enabled ? <Vignette offset={0.15 + vig.softness * 0.5} darkness={valueAt(vig.amount, t)} /> : <></>}
      <primitive object={grain} />
    </EffectComposer>
  );
}
