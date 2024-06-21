
	precision highp float;
	precision highp int;
	precision highp sampler2DArray;

	uniform sampler2DArray diffuse;
	in vec2 vUv;
	flat in uint diffuseIndex;

	out vec4 outColor;

	void main() {

		outColor = texture( diffuse, vec3( vUv, diffuseIndex ) );

	}
	