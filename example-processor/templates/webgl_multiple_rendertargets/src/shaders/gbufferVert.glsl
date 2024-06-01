in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 vNormal;
out vec2 vUv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

void main() {
  vUv = uv;

  // get smooth normals
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  vec3 transformedNormal = normalMatrix * normal;
  vNormal = normalize(transformedNormal);

  gl_Position = projectionMatrix * mvPosition;
}
