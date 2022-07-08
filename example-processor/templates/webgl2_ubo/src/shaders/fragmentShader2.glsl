precision highp float;

uniform sampler2D diffuseMap;

in vec2 vUv;

out vec4 fragColor;

void main() {
  fragColor = texture(diffuseMap, vUv);
}
