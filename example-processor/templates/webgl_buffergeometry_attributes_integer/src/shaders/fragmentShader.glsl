
			flat in int vIndex;
			in vec2 vUv;

			uniform sampler2D uTextures[ 3 ];

			out vec4 outColor;

			void main()	{

				if ( vIndex == 0 ) outColor = texture( uTextures[ 0 ], vUv );
				else if ( vIndex == 1 ) outColor = texture( uTextures[ 1 ], vUv );
				else if ( vIndex == 2 ) outColor = texture( uTextures[ 2 ], vUv );

			}
		