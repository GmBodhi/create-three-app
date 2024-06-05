precision highp float;
precision highp int;

layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gNormal;

uniform sampler2D tDiffuse;
uniform vec2 repeat;

in vec3 vNormal;
in vec2 vUv;

void main() {
  // write color to G-Buffer
  gColor = texture(tDiffuse, vUv * repeat);

  // write normals to G-Buffer
  gNormal = vec4(normalize(vNormal), 0.0);
}
