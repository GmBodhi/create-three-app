"\n\n\t\t\tuniform float time;\n\t\t\tuniform float testing;\n\t\t\tuniform float delta; // about 0.016\n\t\t\tuniform float separationDistance; // 20\n\t\t\tuniform float alignmentDistance; // 40\n\t\t\tuniform float cohesionDistance; //\n\t\t\tuniform float freedomFactor;\n\t\t\tuniform vec3 predator;\n\n\t\t\tconst float width = resolution.x;\n\t\t\tconst float height = resolution.y;\n\n\t\t\tconst float PI = 3.141592653589793;\n\t\t\tconst float PI_2 = PI * 2.0;\n\t\t\t// const float VISION = PI * 0.55;\n\n\t\t\tfloat zoneRadius = 40.0;\n\t\t\tfloat zoneRadiusSquared = 1600.0;\n\n\t\t\tfloat separationThresh = 0.45;\n\t\t\tfloat alignmentThresh = 0.65;\n\n\t\t\tconst float UPPER_BOUNDS = BOUNDS;\n\t\t\tconst float LOWER_BOUNDS = -UPPER_BOUNDS;\n\n\t\t\tconst float SPEED_LIMIT = 9.0;\n\n\t\t\tfloat rand( vec2 co ){\n\t\t\t\treturn fract( sin( dot( co.xy, vec2(12.9898,78.233) ) ) * 43758.5453 );\n\t\t\t}\n\n\t\t\tvoid main() {\n\n\t\t\t\tzoneRadius = separationDistance + alignmentDistance + cohesionDistance;\n\t\t\t\tseparationThresh = separationDistance / zoneRadius;\n\t\t\t\talignmentThresh = ( separationDistance + alignmentDistance ) / zoneRadius;\n\t\t\t\tzoneRadiusSquared = zoneRadius * zoneRadius;\n\n\n\t\t\t\tvec2 uv = gl_FragCoord.xy / resolution.xy;\n\t\t\t\tvec3 birdPosition, birdVelocity;\n\n\t\t\t\tvec3 selfPosition = texture2D( texturePosition, uv ).xyz;\n\t\t\t\tvec3 selfVelocity = texture2D( textureVelocity, uv ).xyz;\n\n\t\t\t\tfloat dist;\n\t\t\t\tvec3 dir; // direction\n\t\t\t\tfloat distSquared;\n\n\t\t\t\tfloat separationSquared = separationDistance * separationDistance;\n\t\t\t\tfloat cohesionSquared = cohesionDistance * cohesionDistance;\n\n\t\t\t\tfloat f;\n\t\t\t\tfloat percent;\n\n\t\t\t\tvec3 velocity = selfVelocity;\n\n\t\t\t\tfloat limit = SPEED_LIMIT;\n\n\t\t\t\tdir = predator * UPPER_BOUNDS - selfPosition;\n\t\t\t\tdir.z = 0.;\n\t\t\t\t// dir.z *= 0.6;\n\t\t\t\tdist = length( dir );\n\t\t\t\tdistSquared = dist * dist;\n\n\t\t\t\tfloat preyRadius = 150.0;\n\t\t\t\tfloat preyRadiusSq = preyRadius * preyRadius;\n\n\n\t\t\t\t// move birds away from predator\n\t\t\t\tif ( dist < preyRadius ) {\n\n\t\t\t\t\tf = ( distSquared / preyRadiusSq - 1.0 ) * delta * 100.;\n\t\t\t\t\tvelocity += normalize( dir ) * f;\n\t\t\t\t\tlimit += 5.0;\n\t\t\t\t}\n\n\n\t\t\t\t// if (testing == 0.0) {}\n\t\t\t\t// if ( rand( uv + time ) < freedomFactor ) {}\n\n\n\t\t\t\t// Attract flocks to the center\n\t\t\t\tvec3 central = vec3( 0., 0., 0. );\n\t\t\t\tdir = selfPosition - central;\n\t\t\t\tdist = length( dir );\n\n\t\t\t\tdir.y *= 2.5;\n\t\t\t\tvelocity -= normalize( dir ) * delta * 5.;\n\n\t\t\t\tfor ( float y = 0.0; y < height; y++ ) {\n\t\t\t\t\tfor ( float x = 0.0; x < width; x++ ) {\n\n\t\t\t\t\t\tvec2 ref = vec2( x + 0.5, y + 0.5 ) / resolution.xy;\n\t\t\t\t\t\tbirdPosition = texture2D( texturePosition, ref ).xyz;\n\n\t\t\t\t\t\tdir = birdPosition - selfPosition;\n\t\t\t\t\t\tdist = length( dir );\n\n\t\t\t\t\t\tif ( dist < 0.0001 ) continue;\n\n\t\t\t\t\t\tdistSquared = dist * dist;\n\n\t\t\t\t\t\tif ( distSquared > zoneRadiusSquared ) continue;\n\n\t\t\t\t\t\tpercent = distSquared / zoneRadiusSquared;\n\n\t\t\t\t\t\tif ( percent < separationThresh ) { // low\n\n\t\t\t\t\t\t\t// Separation - Move apart for comfort\n\t\t\t\t\t\t\tf = ( separationThresh / percent - 1.0 ) * delta;\n\t\t\t\t\t\t\tvelocity -= normalize( dir ) * f;\n\n\t\t\t\t\t\t} else if ( percent < alignmentThresh ) { // high\n\n\t\t\t\t\t\t\t// Alignment - fly the same direction\n\t\t\t\t\t\t\tfloat threshDelta = alignmentThresh - separationThresh;\n\t\t\t\t\t\t\tfloat adjustedPercent = ( percent - separationThresh ) / threshDelta;\n\n\t\t\t\t\t\t\tbirdVelocity = texture2D( textureVelocity, ref ).xyz;\n\n\t\t\t\t\t\t\tf = ( 0.5 - cos( adjustedPercent * PI_2 ) * 0.5 + 0.5 ) * delta;\n\t\t\t\t\t\t\tvelocity += normalize( birdVelocity ) * f;\n\n\t\t\t\t\t\t} else {\n\n\t\t\t\t\t\t\t// Attraction / Cohesion - move closer\n\t\t\t\t\t\t\tfloat threshDelta = 1.0 - alignmentThresh;\n\t\t\t\t\t\t\tfloat adjustedPercent;\n\t\t\t\t\t\t\tif( threshDelta == 0. ) adjustedPercent = 1.;\n\t\t\t\t\t\t\telse adjustedPercent = ( percent - alignmentThresh ) / threshDelta;\n\n\t\t\t\t\t\t\tf = ( 0.5 - ( cos( adjustedPercent * PI_2 ) * -0.5 + 0.5 ) ) * delta;\n\n\t\t\t\t\t\t\tvelocity += normalize( dir ) * f;\n\n\t\t\t\t\t\t}\n\n\t\t\t\t\t}\n\n\t\t\t\t}\n\n\n\n\t\t\t\t// this make tends to fly around than down or up\n\t\t\t\t// if (velocity.y > 0.) velocity.y *= (1. - 0.2 * delta);\n\n\t\t\t\t// Speed Limits\n\t\t\t\tif ( length( velocity ) > limit ) {\n\t\t\t\t\tvelocity = normalize( velocity ) * limit;\n\t\t\t\t}\n\n\t\t\t\tgl_FragColor = vec4( velocity, 1.0 );\n\n\t\t\t}\n\n\t\t"