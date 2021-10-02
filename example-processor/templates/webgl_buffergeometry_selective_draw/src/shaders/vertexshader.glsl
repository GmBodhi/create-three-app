attribute float visible;
varying float vVisible;
attribute vec3 vertColor;
varying vec3 vColor;

void main() {
  vColor = vertColor;
  vVisible = visible;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
