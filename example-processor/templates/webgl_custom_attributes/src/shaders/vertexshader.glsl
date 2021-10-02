uniform float amplitude;

attribute float displacement;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vNormal = normal;
  vUv = (0.5 + amplitude) * uv + vec2(amplitude);

  vec3 newPosition = position + amplitude * normal * vec3(displacement);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
