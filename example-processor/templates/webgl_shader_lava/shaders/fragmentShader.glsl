"\n\n\t\t\tuniform float time;\n\n\t\t\tuniform float fogDensity;\n\t\t\tuniform vec3 fogColor;\n\n\t\t\tuniform sampler2D texture1;\n\t\t\tuniform sampler2D texture2;\n\n\t\t\tvarying vec2 vUv;\n\n\t\t\tvoid main( void ) {\n\n\t\t\t\tvec2 position = - 1.0 + 2.0 * vUv;\n\n\t\t\t\tvec4 noise = texture2D( texture1, vUv );\n\t\t\t\tvec2 T1 = vUv + vec2( 1.5, - 1.5 ) * time * 0.02;\n\t\t\t\tvec2 T2 = vUv + vec2( - 0.5, 2.0 ) * time * 0.01;\n\n\t\t\t\tT1.x += noise.x * 2.0;\n\t\t\t\tT1.y += noise.y * 2.0;\n\t\t\t\tT2.x -= noise.y * 0.2;\n\t\t\t\tT2.y += noise.z * 0.2;\n\n\t\t\t\tfloat p = texture2D( texture1, T1 * 2.0 ).a;\n\n\t\t\t\tvec4 color = texture2D( texture2, T2 * 2.0 );\n\t\t\t\tvec4 temp = color * ( vec4( p, p, p, p ) * 2.0 ) + ( color * color - 0.1 );\n\n\t\t\t\tif( temp.r > 1.0 ) { temp.bg += clamp( temp.r - 2.0, 0.0, 100.0 ); }\n\t\t\t\tif( temp.g > 1.0 ) { temp.rb += temp.g - 1.0; }\n\t\t\t\tif( temp.b > 1.0 ) { temp.rg += temp.b - 1.0; }\n\n\t\t\t\tgl_FragColor = temp;\n\n\t\t\t\tfloat depth = gl_FragCoord.z / gl_FragCoord.w;\n\t\t\t\tconst float LOG2 = 1.442695;\n\t\t\t\tfloat fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );\n\t\t\t\tfogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );\n\n\t\t\t\tgl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );\n\n\t\t\t}\n\n\t\t"