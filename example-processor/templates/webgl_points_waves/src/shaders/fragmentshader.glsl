uniform vec3 color;

void main() {
  if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;

  gl_FragColor = vec4(color, 1.0);
}
