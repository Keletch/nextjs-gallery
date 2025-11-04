import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const AberratedMaterial = shaderMaterial(
  {
    map: null,
    radius: 0.08,
    intensity: 0.0,
  },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform sampler2D map;
    uniform float radius;
    uniform float intensity;
    varying vec2 vUv;

    float roundedMask(vec2 uv, float r) {
      vec2 center = vec2(0.5);
      vec2 size = vec2(1.0 - 2.0 * r);
      vec2 delta = abs(uv - center) - size * 0.5;
      float dist = length(max(delta, 0.0));
      return smoothstep(r, r - 0.01, dist);
    }

    void main() {
      vec2 offset = vec2(intensity * 0.008);
      vec4 texR = texture2D(map, vUv + offset);
      vec4 texG = texture2D(map, vUv);
      vec4 texB = texture2D(map, vUv - offset);
      vec4 tex = vec4(texR.r, texG.g, texB.b, texG.a);

      float mask = roundedMask(vUv, radius);
      if (mask < 0.01) discard;

      gl_FragColor = vec4(pow(tex.rgb, vec3(1.0 / 2.2)), tex.a);
    }
  `
)

extend({ AberratedMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    aberratedMaterial: any
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      aberratedMaterial: any
    }
  }
}

export {}