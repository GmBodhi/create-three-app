"\n\n\t\t\tuniform float time;\n\n\t\t\tvarying vec2 vUv;\n\n\t\t\tvoid main(void) {\n\n\t\t\t\tvec2 p = - 1.0 + 2.0 * vUv;\n\t\t\t\tfloat a = time * 40.0;\n\t\t\t\tfloat d, e, f, g = 1.0 / 40.0 ,h ,i ,r ,q;\n\n\t\t\t\te = 400.0 * ( p.x * 0.5 + 0.5 );\n\t\t\t\tf = 400.0 * ( p.y * 0.5 + 0.5 );\n\t\t\t\ti = 200.0 + sin( e * g + a / 150.0 ) * 20.0;\n\t\t\t\td = 200.0 + cos( f * g / 2.0 ) * 18.0 + cos( e * g ) * 7.0;\n\t\t\t\tr = sqrt( pow( abs( i - e ), 2.0 ) + pow( abs( d - f ), 2.0 ) );\n\t\t\t\tq = f / r;\n\t\t\t\te = ( r * cos( q ) ) - a / 2.0;\n\t\t\t\tf = ( r * sin( q ) ) - a / 2.0;\n\t\t\t\td = sin( e * g ) * 176.0 + sin( e * g ) * 164.0 + r;\n\t\t\t\th = ( ( f + d ) + a / 2.0 ) * g;\n\t\t\t\ti = cos( h + r * p.x / 1.3 ) * ( e + e + a ) + cos( q * g * 6.0 ) * ( r + h / 3.0 );\n\t\t\t\th = sin( f * g ) * 144.0 - sin( e * g ) * 212.0 * p.x;\n\t\t\t\th = ( h + ( f - e ) * q + sin( r - ( a + h ) / 7.0 ) * 10.0 + i / 4.0 ) * g;\n\t\t\t\ti += cos( h * 2.3 * sin( a / 350.0 - q ) ) * 184.0 * sin( q - ( r * 4.3 + a / 12.0 ) * g ) + tan( r * g + h ) * 184.0 * cos( r * g + h );\n\t\t\t\ti = mod( i / 5.6, 256.0 ) / 64.0;\n\t\t\t\tif ( i < 0.0 ) i += 4.0;\n\t\t\t\tif ( i >= 2.0 ) i = 4.0 - i;\n\t\t\t\td = r / 350.0;\n\t\t\t\td += sin( d * d * 8.0 ) * 0.52;\n\t\t\t\tf = ( sin( a * g ) + 1.0 ) / 2.0;\n\t\t\t\tgl_FragColor = vec4( vec3( f * i / 1.6, i / 2.0 + d / 13.0, i ) * d * p.x + vec3( i / 1.3 + d / 8.0, i / 2.0 + d / 18.0, i ) * d * ( 1.0 - p.x ), 1.0 );\n\n\t\t\t}\n\n\t\t"