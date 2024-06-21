
	uniform vec2 size;
	attribute uint instancedIndex;
	flat out uint diffuseIndex; 
	out vec2 vUv;

	void main() {

		vec3 translation = vec3(0, float(instancedIndex) * size.y - size.y, 0);
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position + translation, 1.0 );

		diffuseIndex = instancedIndex;

		// Convert position.xy to 1.0-0.0

		vUv.xy = position.xy / size + 0.5;
		vUv.y = 1.0 - vUv.y; // original data is upside down

	}
	