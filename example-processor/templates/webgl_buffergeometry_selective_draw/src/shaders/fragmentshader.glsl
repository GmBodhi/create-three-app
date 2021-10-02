varying float vVisible;
varying vec3 vColor;

void main() {
  if (vVisible > 0.0) {
    gl_FragColor = vec4(vColor, 1.0);
  } else {
    discard;
  }
}
