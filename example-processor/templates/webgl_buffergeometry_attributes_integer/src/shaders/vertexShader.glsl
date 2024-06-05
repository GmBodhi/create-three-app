
			in int textureIndex;

			flat out int vIndex; // "flat" indicates that the value will not be interpolated (required for integer attributes)
			out vec2 vUv;

			void main()	{

				vIndex = textureIndex;
				vUv = uv;

				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			}
		