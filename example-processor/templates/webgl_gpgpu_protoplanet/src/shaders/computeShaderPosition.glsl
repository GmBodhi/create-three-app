#define delta(1.0 / 60.0)

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 tmpPos = texture2D(texturePosition, uv);
  vec3 pos = tmpPos.xyz;

  vec4 tmpVel = texture2D(textureVelocity, uv);
  vec3 vel = tmpVel.xyz;
  float mass = tmpVel.w;

  if (mass == 0.0) {
    vel = vec3(0.0);
  }

  // Dynamics
  pos += vel * delta;

  gl_FragColor = vec4(pos, 1.0);
}
