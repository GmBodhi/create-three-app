precision highp float;

vec4 LinearTosRGB(in vec4 value) {
  return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
}

uniform sampler2D diffuseMap;

in vec2 vUv;
in vec3 vPositionEye;
in vec3 vNormalEye;
out vec4 fragColor;

uniform LightingData {
  vec3 position;
  vec3 ambientColor;
  vec3 diffuseColor;
  vec3 specularColor;
  float shininess;
} Light;

void main() {
  // a very basic lighting equation (Phong reflection model) for testing

  vec3 l = normalize(Light.position - vPositionEye);
  vec3 n = normalize(vNormalEye);
  vec3 e = -normalize(vPositionEye);
  vec3 r = normalize(reflect(-l, n));

  float diffuseLightWeighting = max(dot(n, l), 0.0);
  float specularLightWeighting = max(dot(r, e), 0.0);

  specularLightWeighting = pow(specularLightWeighting, Light.shininess);

  vec3 lightWeighting = Light.ambientColor +
    Light.diffuseColor * diffuseLightWeighting +
    Light.specularColor * specularLightWeighting;

  fragColor = vec4(texture(diffuseMap, vUv).rgb * lightWeighting.rgb, 1.0);

  fragColor = LinearTosRGB(fragColor);
}
