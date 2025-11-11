import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const RoundedMaterial = shaderMaterial(
  {
    map: null,
    radius: 0.08,
    size: [1.0, 1.0], // tamaño físico del plano
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
    precision highp float;
    uniform sampler2D map;
    uniform float radius;
    uniform vec2 size;
    varying vec2 vUv;

    float roundedMask(vec2 uv, float r, vec2 s) {
      vec2 pixel = uv * s;
      vec2 halfSize = s * 0.5;
      vec2 inner = halfSize - vec2(r);
      vec2 delta = abs(pixel - halfSize) - inner;
      float dist = length(max(delta, 0.0));
      return smoothstep(r, r - 1.0, dist);
    }

    void main() {
      vec4 tex = texture2D(map, vUv);
      float mask = roundedMask(vUv, radius * min(size.x, size.y), size);
      if (mask < 0.01) discard;
      gl_FragColor = vec4(pow(tex.rgb, vec3(1.0 / 2.2)), tex.a);
    }
  `
)

extend({ RoundedMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    roundedMaterial: any
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      roundedMaterial: any
    }
  }
}

export {}