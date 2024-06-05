uniform ViewData {
  mat4 projectionMatrix;
  mat4 viewMatrix;
};

uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

in vec3 position;
in vec3 normal;

out vec3 vPositionEye;
out vec3 vNormalEye;

void main() {
  vec4 vertexPositionEye = viewMatrix * modelMatrix * vec4(position, 1.0);

  vPositionEye = vertexPositionEye.xyz;
  vNormalEye = normalMatrix * normal;

  gl_Position = projectionMatrix * vertexPositionEye;
}
