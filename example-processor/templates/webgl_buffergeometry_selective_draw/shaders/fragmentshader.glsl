"\n\t\tvarying float vVisible;\n\t\tvarying vec3 vColor;\n\n\t\tvoid main() {\n\n\t\t\tif ( vVisible > 0.0 ) {\n\n\t\t\t\tgl_FragColor = vec4( vColor, 1.0 );\n\n\t\t\t} else {\n\n\t\t\t\tdiscard;\n\n\t\t\t}\n\n\t\t}\n\t"