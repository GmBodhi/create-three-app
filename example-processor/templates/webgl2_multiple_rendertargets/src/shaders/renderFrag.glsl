precision highp float;
precision highp int;

layout(location = 0) out vec4 pc_FragColor;

in vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tNormal;

void main() {
  vec3 diffuse = texture(tDiffuse, vUv).rgb;
  vec3 normal = texture(tNormal, vUv).rgb;

  pc_FragColor.rgb = mix(diffuse, normal, step(0.5, vUv.x));
  pc_FragColor.a = 1.0;
}
