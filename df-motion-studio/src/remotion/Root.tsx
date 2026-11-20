import React from 'react';
import { Composition, type CalculateMetadataFunction } from 'remotion';
import { StudioComposition, type CompositionProps } from './Scene';
import { ASPECT_SIZE, Project } from '../schema/project';
import { createSampleProject } from '../schema/defaults';

/** Composition size, fps and length all come from project.json. */
export const calculateMetadata: CalculateMetadataFunction<CompositionProps> = ({ props }) => {
  const project = Project.parse(props.project);
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
    defaultProps={{ project: createSampleProject(), quality: 'full' } satisfies CompositionProps}
    calculateMetadata={calculateMetadata}
  />
);
