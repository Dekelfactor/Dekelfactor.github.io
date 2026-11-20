import { Project, SCHEMA_ID, type Light, type ProjectInput } from './project';

const light = (l: Partial<Light> & Pick<Light, 'azimuth' | 'elevation'>): Light => ({
  enabled: true, distance: 8, intensity: 1, temperature: 5600, softness: 0.5, ...l,
});

/** The starter project: a 6 second studio reveal of the DF monogram. */
export const sampleProject: ProjectInput = {
  $schema: SCHEMA_ID,
  name: 'Studio reveal',
  fps: 30,
  duration: 6,
  aspect: '9:16',
  safeArea: 0.06,
  assets: {},
  layers: [
    {
      id: 'plinth', name: 'Plinth', type: 'shape', shape: 'roundedBox', duration: 6,
      color: '#3a332c', metalness: 0, roughness: 0.55,
      transform: { position: [0, 0.25, 0], rotation: [0, 0, 0], scale: [4.6, 0.5, 2.2], opacity: 1 },
    },
    {
      id: 'logo', name: 'DF monogram', type: 'shape', shape: 'df-monogram', duration: 6, protect: true,
      color: '#d9cbb4', metalness: 1, roughness: 0.28,
      transform: {
        position: [0, 1.52, 0],
        rotation: { keys: [{ t: 0, v: [0, -28, 0], ease: 'overshoot' }, { t: 1.8, v: [0, -10, 0], ease: 'smooth' }, { t: 6, v: [0, 8, 0] }] },
        scale: { keys: [{ t: 0, v: [0.9, 0.9, 0.9], ease: 'overshoot' }, { t: 1.8, v: [1, 1, 1] }] },
        opacity: { keys: [{ t: 0, v: 0, ease: 'easeOut' }, { t: 0.7, v: 1 }] },
      },
    },
    {
      id: 'orb', name: 'Orb', type: 'shape', shape: 'sphere', duration: 6,
      color: '#f2a541', metalness: 0, roughness: 0.15, emissive: 0.25,
      transform: {
        position: {
          keys: [
            { t: 0, v: [-2.9, 1.2, 0.6], ease: 'smooth' },
            { t: 2, v: [-1.2, 1.5, 1.9], ease: 'smooth' },
            { t: 4, v: [1.8, 1.0, 1.7], ease: 'smooth' },
            { t: 6, v: [2.9, 1.3, 0.2] },
          ],
        },
        rotation: [0, 0, 0], scale: [0.34, 0.34, 0.34], opacity: 1,
      },
    },
    {
      id: 'caption', name: 'Caption', type: 'text', text: 'Made by hand', font: 'newsreader', size: 0.26, start: 2, duration: 4,
      color: '#ede4d6', align: 'center', letterSpacing: 0,
      transform: {
        position: { keys: [{ t: 2, v: [0, 0.25, 1.45], ease: 'snappy' }, { t: 3, v: [0, 0.25, 1.13] }] },
        rotation: [0, 0, 0], scale: [1, 1, 1],
        opacity: { keys: [{ t: 2, v: 0, ease: 'easeOut' }, { t: 2.8, v: 1 }] },
      },
    },
  ],
  camera: {
    position: { keys: [{ t: 0, v: [1.4, 3.0, 16.5], ease: 'smooth' }, { t: 6, v: [0, 2.4, 13.5] }] },
    target: [0, 1.3, 0],
    fov: 38,
    roll: 0,
    dof: { enabled: false, focusDistance: 14, aperture: 0.3 },
  },
  lights: {
    key: light({ azimuth: 35, elevation: 40, intensity: 1.1, temperature: 4300, softness: 0.6 }),
    fill: light({ azimuth: -60, elevation: 15, intensity: 0.3, temperature: 6500, softness: 0.9 }),
    rim: light({ azimuth: 155, elevation: 35, intensity: { keys: [{ t: 0, v: 0, ease: 'easeOut' }, { t: 1.2, v: 1.6 }] }, temperature: 3200, softness: 0.4 }),
  },
  environment: {
    preset: 'studio', intensity: 1, background: '#1d1915',
    ground: { enabled: true, color: '#1e1a16', reflectivity: 0.15 },
    backdrop: { enabled: true, color: '#231e19' },
    fog: { enabled: true, color: '#1d1915', near: 14, far: 32 },
  },
  effects: {
    bloom: { enabled: true, intensity: 0.5, threshold: 0.85, radius: 0.6 },
    grain: { enabled: true, amount: 0.05 },
    vignette: { enabled: true, amount: 0.45, softness: 0.5 },
    grade: { exposure: 0, contrast: 0.05, saturation: 0, temperature: 0.05, tint: 0 },
    motionBlur: { enabled: false, shutter: 0.5, samples: 6 },
  },
};

export const createSampleProject = () => Project.parse(structuredClone(sampleProject));

export const createBlankProject = () => Project.parse({
  ...structuredClone(sampleProject),
  name: 'Untitled',
  layers: [],
  lights: {
    key: light({ azimuth: 35, elevation: 40, intensity: 1.2, temperature: 4500 }),
    fill: light({ azimuth: -60, elevation: 15, intensity: 0.3, temperature: 6500 }),
    rim: light({ azimuth: 155, elevation: 35, intensity: 1, temperature: 4000 }),
  },
  camera: { position: [0, 2.2, 13], target: [0, 1.2, 0], fov: 36, roll: 0, dof: { enabled: false, focusDistance: 13, aperture: 0.3 } },
});
