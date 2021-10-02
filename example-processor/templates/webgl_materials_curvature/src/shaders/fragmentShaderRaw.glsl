varying vec3 vViewPosition;
varying float vCurvature;

void main() {
  gl_FragColor = vec4(vCurvature * 2.0, 0.0, 0.0, 0.0);
}
