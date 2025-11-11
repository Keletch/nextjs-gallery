import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const NebulaMaterial = shaderMaterial(
  {
    time: 0,
    resolution: [1, 1],
    seed: Math.random() * 1000,
    aspect: 1.0,
    area: 300000.0,
    subColor: [0.28, 0.07, 0.38],
    accentColor: [0.0, 0.0, 0.0],
  },
  /* vertex shader */
  `
    precision highp float;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* fragment shader */
  `
    #pragma optimize(on)
    #pragma debug(off)
    precision highp float;
    uniform float time;
    uniform float seed;
    uniform vec2 resolution;
    uniform float aspect;
    uniform float area;
    uniform vec3 subColor;
    uniform vec3 accentColor;
    varying vec2 vUv;

    float polygonDistance(vec2 p, float radius, float angleOffset, int sideCount) {
      float a = atan(p.x, p.y) + angleOffset;
      float b = 6.28319 / float(sideCount);
      return cos(floor(.5 + a / b) * b - a) * length(p) - radius;
    }

    #define HASHSCALE1 443.8975
    float hash11(float p) {
      vec3 p3 = fract(vec3(p) * HASHSCALE1);
      p3 += dot(p3, p3.yzx + 19.19);
      return fract((p3.x + p3.y) * p3.z);
    }

    #define HASHSCALE3 vec3(.1031, .1030, .0973)
    vec2 hash21(float p) {
      vec3 p3 = fract(vec3(p) * HASHSCALE3);
      p3 += dot(p3, p3.yzx + 19.19);
      return fract(vec2((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y));
    }

    void main() {
      vec2 fragCoord = vUv * resolution;
      vec2 uv = vec2(0.5) - (fragCoord / resolution);
      uv.x *= aspect;

      bool isMobile = resolution.x < 600.0;
      float radius = isMobile
        ? mix(0.4, 0.6, clamp(area / 300000.0, 0.0, 1.0))
        : 0.5;

      float baseTwist = sin(time * 0.1 + seed) * 0.9;

      float accum = 0.0;
      for (int i = 0; i < 30; i++) {
        mediump float fi = float(i) + seed;
        mediump float yOffset = mod(hash11(fi * 0.017 + seed) * (time + 19.0) * 0.2, 4.0) - 2.0;

        vec2 center = (hash21(fi) * 2.0 - 1.0) * vec2(aspect, 1.0) * 0.9 - vec2(0.0, yOffset);

        vec2 offset = uv - center;
        mediump float twist = (hash11(fi * 0.0347 + seed) * 2.0 - 1.0) * 1.9;
        float rotation = 0.1 + time * 0.2 + baseTwist + (length(offset) / radius) * twist;
        float d = polygonDistance(uv - center, 0.1 + hash11(fi * 2.3 + seed) * 0.2, rotation, 5) + 0.1;
        float s = smoothstep(radius, 0.0, d);
        accum += s * s;
      }

      float scale = isMobile ? 1.2 : 0.6;
      accum = clamp(accum * scale, 0.0, 1.0);

      vec3 base = mix(accentColor, subColor, accum);
      vec3 color = mix(base, vec3(0.0), 0.1);

      gl_FragColor = vec4(color, 1.0);
    }
  `
)

extend({ NebulaMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    nebulaMaterial: any
  }
}