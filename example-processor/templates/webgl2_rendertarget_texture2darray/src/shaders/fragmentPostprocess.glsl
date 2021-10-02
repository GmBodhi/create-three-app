precision highp sampler2DArray;
precision mediump float;

in vec2 vUv;

uniform sampler2DArray uTexture;
uniform int uDepth;
uniform float uIntensity;

void main()
{
  float voxel = texture(uTexture, vec3(vUv, uDepth)).r;
  gl_FragColor.r = voxel * uIntensity;
}
