uniform float time;

varying vec4 vColor;

void main() {
  vColor = color;

  #ifdef USE_CLIP_DISTANCE
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  gl_ClipDistance[0] = worldPosition.x - sin(time) * (0.5);
  #endif

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
