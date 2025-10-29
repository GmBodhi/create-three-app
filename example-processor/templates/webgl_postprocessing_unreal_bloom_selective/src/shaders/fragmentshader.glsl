uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
uniform float bloomStrength;

varying vec2 vUv;

void main() {
  gl_FragColor = (texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv) * bloomStrength);
}
