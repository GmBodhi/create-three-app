"\n\n\t\t\tvarying vec2 vUv;\n\t\t\tuniform float time;\n\n\t\t\tvoid main() {\n\n\t\t\t\tfloat r = vUv.x;\n\t\t\t\tif( vUv.y < 0.5 ) r = 0.0;\n\t\t\t\tfloat g = vUv.y;\n\t\t\t\tif( vUv.x < 0.5 ) g = 0.0;\n\n\t\t\t\tgl_FragColor = vec4( r, g, time, 1.0 );\n\n\t\t\t}\n\n\t\t"