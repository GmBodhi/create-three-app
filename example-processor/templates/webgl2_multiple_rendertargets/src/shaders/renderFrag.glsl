precision highp float;
precision highp int;

vec4 LinearTosRGB(in vec4 value) {
  return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
}

layout(location = 0) out vec4 pc_FragColor;

in vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tNormal;

void main() {
  vec4 diffuse = texture(tDiffuse, vUv);
  vec4 normal = texture(tNormal, vUv);

  pc_FragColor = mix(diffuse, normal, step(0.5, vUv.x));
  pc_FragColor.a = 1.0;

  pc_FragColor = LinearTosRGB(pc_FragColor);
}
