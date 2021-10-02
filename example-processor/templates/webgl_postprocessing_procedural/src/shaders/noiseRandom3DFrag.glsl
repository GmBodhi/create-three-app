#include < common >

varying vec2 vUv;

void main() {
  vec3 rand3 = vec3(rand(vUv), rand(vUv + vec2(0.4, 0.6)), rand(vUv + vec2(0.6, 0.4)));
  gl_FragColor.xyz = rand3;
  gl_FragColor.w = 1.0;
}
