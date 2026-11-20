import { Effect, BlendFunction } from 'postprocessing';
import { Uniform } from 'three';

/**
 * Film grain seeded by the frame number, so exports are deterministic
 * (postprocessing's NoiseEffect uses wall-clock time and would flicker in renders).
 */
export class GrainEffect extends Effect {
  constructor() {
    super('GrainEffect', /* glsl */ `
      uniform float amount;
      uniform float seed;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 p = uv * resolution + seed * 17.0;
        float n = (h(p) + h(p + 0.37) - 1.0);
        float lum = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        float w = mix(1.0, 0.45, smoothstep(0.35, 1.0, lum)); // less grain in highlights, like film
        outputColor = vec4(inputColor.rgb + n * amount * 0.35 * w, inputColor.a);
      }`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([['amount', new Uniform(0.05)], ['seed', new Uniform(0)]]),
    });
  }
  set(amount: number, seed: number) {
    this.uniforms.get('amount')!.value = amount;
    this.uniforms.get('seed')!.value = seed % 1000;
  }
}

/** Exposure, contrast, saturation, white balance. Runs after tone mapping. */
export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', /* glsl */ `
      uniform float exposure;
      uniform float contrast;
      uniform float saturation;
      uniform float temperature;
      uniform float tint;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb * exp2(exposure);
        c *= vec3(1.0 + 0.10 * temperature, 1.0 - 0.06 * tint, 1.0 - 0.10 * temperature);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, 1.0 + saturation);
        c = (c - 0.5) * (1.0 + contrast) + 0.5;
        outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
      }`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>(['exposure', 'contrast', 'saturation', 'temperature', 'tint'].map(k => [k, new Uniform(0)])),
    });
  }
  set(v: { exposure: number; contrast: number; saturation: number; temperature: number; tint: number }) {
    for (const [k, val] of Object.entries(v)) this.uniforms.get(k)!.value = val;
  }
}
