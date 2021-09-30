"\n\n\t\t\tuniform float amplitude;\n\n\t\t\tattribute vec3 displacement;\n\t\t\tattribute vec3 customColor;\n\n\t\t\tvarying vec3 vColor;\n\n\t\t\tvoid main() {\n\n\t\t\t\tvec3 newPosition = position + amplitude * displacement;\n\n\t\t\t\tvColor = customColor;\n\n\t\t\t\tgl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );\n\n\t\t\t}\n\n\t\t"