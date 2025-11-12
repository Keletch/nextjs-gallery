import * as THREE from 'three'

export const GrainMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;

    uniform float u_time;
    uniform vec2 u_resolution;

    #define SPEED 2.0
    #define INTENSITY 0.025
    #define MEAN 0.0
    #define VARIANCE 0.3

    float gaussian(float z, float u, float o) {
      return (1.0 / (o * sqrt(6.2831))) * exp(-((z - u) * (z - u)) / (2.0 * o * o));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float t = u_time * SPEED;
      float seed = dot(uv, vec2(12.9898, 78.233));
      float noise = fract(sin(seed) * 43758.5453 + t);
      noise = gaussian(noise, MEAN, VARIANCE * VARIANCE);

      vec3 grain = vec3(noise);
      gl_FragColor = vec4(grain, INTENSITY);
    }
  `,
})
