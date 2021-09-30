"\n\n\t\t\tuniform sampler2D smoothTexture;\n\n\t\t\tvoid main()\t{\n\n\t\t\t\tvec2 cellSize = 1.0 / resolution.xy;\n\n\t\t\t\tvec2 uv = gl_FragCoord.xy * cellSize;\n\n\t\t\t\t// Computes the mean of texel and 4 neighbours\n\t\t\t\tvec4 textureValue = texture2D( smoothTexture, uv );\n\t\t\t\ttextureValue += texture2D( smoothTexture, uv + vec2( 0.0, cellSize.y ) );\n\t\t\t\ttextureValue += texture2D( smoothTexture, uv + vec2( 0.0, - cellSize.y ) );\n\t\t\t\ttextureValue += texture2D( smoothTexture, uv + vec2( cellSize.x, 0.0 ) );\n\t\t\t\ttextureValue += texture2D( smoothTexture, uv + vec2( - cellSize.x, 0.0 ) );\n\n\t\t\t\ttextureValue /= 5.0;\n\n\t\t\t\tgl_FragColor = textureValue;\n\n\t\t\t}\n\n\t\t"