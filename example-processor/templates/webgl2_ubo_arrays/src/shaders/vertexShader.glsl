uniform ViewData {
  mat4 projectionMatrix;
  mat4 viewMatrix;
};

uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

in vec3 position;
in vec3 normal;
in vec2 uv;
out vec2 vUv;

out vec3 vPositionEye;
out vec3 vNormalEye;

void main() {
  vec4 vertexPositionEye = viewMatrix * modelMatrix * vec4(position, 1.0);

  vPositionEye = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormalEye = (vec4(normal, 1.)).xyz;

  vUv = uv;

  gl_Position = projectionMatrix * vertexPositionEye;
}
