"\n\n\t\tvarying vec3 vViewPosition;\n\t\tvarying float vCurvature;\n\n\t\tvoid main() {\n\t\t\t\tgl_FragColor = vec4( vCurvature * 2.0, 0.0, 0.0, 0.0 );\n\t\t}\n\n\t\t"