"\n\n\t\t\tattribute float size;\n\n\t\t\tvarying vec3 vColor;\n\n\t\t\tvoid main() {\n\n\t\t\t\tvColor = color;\n\n\t\t\t\tvec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n\n\t\t\t\tgl_PointSize = size * ( 300.0 / -mvPosition.z );\n\n\t\t\t\tgl_Position = projectionMatrix * mvPosition;\n\n\t\t\t}\n\n\t\t"