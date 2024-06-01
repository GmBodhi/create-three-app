precision highp float;
precision highp int;

uniform LightingData {
  vec4 lightPosition[POINTLIGHTS_MAX];
  vec4 lightColor[POINTLIGHTS_MAX];
  float pointLightsCount;
};

#include < common >
float getDistanceAttenuation(const in float lightDistance, const in float cutoffDistance, const in float decayExponent) {
  float distanceFalloff = 1.0 / max(pow(lightDistance, decayExponent), 0.01);

  if (cutoffDistance > 0.0) {
    distanceFalloff *= pow2(saturate(1.0 - pow4(lightDistance / cutoffDistance)));
  }

  return distanceFalloff;
}

in vec2 vUv;
in vec3 vPositionEye;
in vec3 vNormalEye;
out vec4 fragColor;

void main() {
  vec4 color = vec4(vec3(0.), 1.);
  for (int x = 0; x < int(pointLightsCount); x++) {
    vec3 offset = lightPosition[x].xyz - vPositionEye;
    vec3 dirToLight = normalize(offset);
    float distance = length(offset);

    float diffuse = max(0.0, dot(vNormalEye, dirToLight));
    float attenuation = 1.0 / (distance * distance);

    vec3 lightWeighting = lightColor[x].xyz * getDistanceAttenuation(distance, 4., .7);
    color.rgb += lightWeighting;
  }
  fragColor = color;
}
