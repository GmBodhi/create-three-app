uniform float amplitude;

attribute vec3 displacement;
attribute vec3 customColor;

varying vec3 vColor;

void main() {
  vec3 newPosition = position + amplitude * displacement;

  vColor = customColor;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
