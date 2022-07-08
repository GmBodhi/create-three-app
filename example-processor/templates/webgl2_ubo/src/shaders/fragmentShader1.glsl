precision highp float;

uniform LightingData {
  vec3 position;
  vec3 ambientColor;
  vec3 diffuseColor;
  vec3 specularColor;
  float shininess;
} Light;

uniform vec3 color;

in vec3 vPositionEye;
in vec3 vNormalEye;

out vec4 fragColor;

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

  fragColor = vec4(color.rgb * lightWeighting.rgb, 1.0);
}
