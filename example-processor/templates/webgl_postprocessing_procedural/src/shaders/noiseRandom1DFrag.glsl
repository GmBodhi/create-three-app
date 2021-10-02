#include < common >

varying vec2 vUv;

void main() {
  gl_FragColor.xyz = vec3(rand(vUv));
  gl_FragColor.w = 1.0;
}
