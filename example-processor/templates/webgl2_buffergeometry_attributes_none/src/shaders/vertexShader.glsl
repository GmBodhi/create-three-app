
			
			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;
			
			uniform float seed;
			
			const uint ieeeMantissa = 0x007FFFFFu;
			const uint ieeeOne = 0x3F800000u;

			uint hash(uint x) {
				x += ( x << 10u );
				x ^= ( x >>  6u );
				x += ( x <<  3u );
				x ^= ( x >> 11u );
				x += ( x << 15u );
				return x;
			}
			
			uint hash(uvec2 v) { return hash( v.x ^ hash(v.y) ); }
			
			float hashNoise(vec2 xy) {
				uint m = hash(floatBitsToUint(xy)); 
				
				m &= ieeeMantissa;
				m |= ieeeOne;
				
				return uintBitsToFloat( m ) - 1.0;
			}
			
			float pseudoRandom(float lower, float delta, in vec2 xy) {
				return lower + delta*hashNoise(xy);
			}
			
			vec3 pseudoRandomVec3(float lower, float upper, int index) {
				float delta = upper - lower;
				float x = pseudoRandom(lower, delta, vec2(index, 0));
				float y = pseudoRandom(lower, delta, vec2(index, 1));
				float z = pseudoRandom(lower, delta, vec2(index, 2));
				return vec3(x, y, z);
			}
			
			out vec3 vColor;

			void main()	{

				const float scale = 1.0/64.0;
				vec3 position = pseudoRandomVec3(-1.0, +1.0, gl_VertexID/3) + scale * pseudoRandomVec3(-1.0, +1.0, gl_VertexID);
				vec3 color = pseudoRandomVec3(0.25, 1.0, gl_VertexID/3);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
				vColor = color;

			}
		