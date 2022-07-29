uniform ViewData {
  mat4 projectionMatrix;
  mat4 viewMatrix;
};

uniform mat4 modelMatrix;

in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;

  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
