import * as THREE from 'three';

/** Approximate RGB of a black-body at `kelvin` (Tanner Helland fit), as a linear THREE.Color. */
export function kelvinToColor(kelvin: number, target = new THREE.Color()) {
  const t = Math.min(12000, Math.max(1500, kelvin)) / 100;
  let r: number, g: number, b: number;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; }
  else { r = 329.698727446 * (t - 60) ** -0.1332047592; g = 288.1221695283 * (t - 60) ** -0.0755148492; }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v: number) => Math.min(255, Math.max(0, v)) / 255;
  return target.setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
}

/** CSS colour for a temperature, for UI swatches. */
export function kelvinToCss(kelvin: number) {
  return '#' + kelvinToColor(kelvin).getHexString(THREE.SRGBColorSpace);
}
