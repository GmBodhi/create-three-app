"\n\n\t\tattribute float curvature;\n\n\t\tvarying float vCurvature;\n\n\t\tvoid main() {\n\n\t\t\tvec3 p = position;\n\t\t\tvec4 modelViewPosition = modelViewMatrix * vec4( p , 1.0 );\n\t\t\tgl_Position = projectionMatrix * modelViewPosition;\n\t\t\tvCurvature = curvature;\n\n\t\t}\n\n\t\t"