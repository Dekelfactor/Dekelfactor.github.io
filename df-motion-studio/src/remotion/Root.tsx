import React from 'react';
import { Composition, type CalculateMetadataFunction } from 'remotion';
import { StudioComposition, type CompositionProps } from './Scene';
import { ASPECT_SIZE, Project } from '../schema/project';
import { createSampleProject } from '../schema/defaults';
import { scanSafeArea } from '../engine/safeArea';

/** Composition size, fps and length all come from project.json. */
export const calculateMetadata: CalculateMetadataFunction<CompositionProps> = ({ props }) => {
  const parsed = Project.safeParse(props.project);
  if (!parsed.success) throw new Error(`project.json is invalid:\n${parsed.error.issues.slice(0, 10).map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  const project = parsed.data;
  // The DF logo must never be clipped: refuse to render unless explicitly overridden.
  const safe = scanSafeArea(project);
  if (!safe.ok && !props.allowClipping) {
    throw new Error(`${safe.layerName} leaves the ${Math.round(project.safeArea * 100)}% safe area at ${safe.time.toFixed(2)} s in ${project.aspect}. Fix the framing, or pass --allow-clipping.`);
  }
  const { width, height } = ASPECT_SIZE[project.aspect];
  return { width, height, fps: project.fps, durationInFrames: Math.max(1, Math.round(project.duration * project.fps)), props: { ...props, project } };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Studio"
    component={StudioComposition}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={180}
    defaultProps={{ project: createSampleProject(), quality: 'full', allowClipping: false }}
    calculateMetadata={calculateMetadata}
  />
);
