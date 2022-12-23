layout(std140) uniform ViewData {
  mat4 projectionMatrix;
  mat4 viewMatrix;
};

uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 vPositionEye;
out vec3 vNormalEye;
out vec2 vUv;

void main() {
  vec4 vertexPositionEye = viewMatrix * modelMatrix * vec4(position, 1.0);

  vPositionEye = vertexPositionEye.xyz;
  vNormalEye = normalMatrix * normal;
  vUv = uv;
  gl_Position = projectionMatrix * vertexPositionEye;
}
