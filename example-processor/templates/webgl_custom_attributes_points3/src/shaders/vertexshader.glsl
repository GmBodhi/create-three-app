attribute float size;
attribute vec4 ca;

varying vec4 vColor;

void main() {
  vColor = ca;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_PointSize = size * (150.0 / -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;
}
