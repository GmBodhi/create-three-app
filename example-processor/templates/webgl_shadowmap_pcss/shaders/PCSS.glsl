"\n\n\t\t\t\t#define LIGHT_WORLD_SIZE 0.005\n\t\t\t\t#define LIGHT_FRUSTUM_WIDTH 3.75\n\t\t\t\t#define LIGHT_SIZE_UV (LIGHT_WORLD_SIZE / LIGHT_FRUSTUM_WIDTH)\n\t\t\t\t#define NEAR_PLANE 9.5\n\n\t\t\t\t#define NUM_SAMPLES 17\n\t\t\t\t#define NUM_RINGS 11\n\t\t\t\t#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES\n\t\t\t\t#define PCF_NUM_SAMPLES NUM_SAMPLES\n\n\t\t\t\tvec2 poissonDisk[NUM_SAMPLES];\n\n\t\t\t\tvoid initPoissonSamples( const in vec2 randomSeed ) {\n\t\t\t\t\tfloat ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );\n\t\t\t\t\tfloat INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );\n\n\t\t\t\t\t// jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/\n\t\t\t\t\tfloat angle = rand( randomSeed ) * PI2;\n\t\t\t\t\tfloat radius = INV_NUM_SAMPLES;\n\t\t\t\t\tfloat radiusStep = radius;\n\n\t\t\t\t\tfor( int i = 0; i < NUM_SAMPLES; i ++ ) {\n\t\t\t\t\t\tpoissonDisk[i] = vec2( cos( angle ), sin( angle ) ) * pow( radius, 0.75 );\n\t\t\t\t\t\tradius += radiusStep;\n\t\t\t\t\t\tangle += ANGLE_STEP;\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\tfloat penumbraSize( const in float zReceiver, const in float zBlocker ) { // Parallel plane estimation\n\t\t\t\t\treturn (zReceiver - zBlocker) / zBlocker;\n\t\t\t\t}\n\n\t\t\t\tfloat findBlocker( sampler2D shadowMap, const in vec2 uv, const in float zReceiver ) {\n\t\t\t\t\t// This uses similar triangles to compute what\n\t\t\t\t\t// area of the shadow map we should search\n\t\t\t\t\tfloat searchRadius = LIGHT_SIZE_UV * ( zReceiver - NEAR_PLANE ) / zReceiver;\n\t\t\t\t\tfloat blockerDepthSum = 0.0;\n\t\t\t\t\tint numBlockers = 0;\n\n\t\t\t\t\tfor( int i = 0; i < BLOCKER_SEARCH_NUM_SAMPLES; i++ ) {\n\t\t\t\t\t\tfloat shadowMapDepth = unpackRGBAToDepth(texture2D(shadowMap, uv + poissonDisk[i] * searchRadius));\n\t\t\t\t\t\tif ( shadowMapDepth < zReceiver ) {\n\t\t\t\t\t\t\tblockerDepthSum += shadowMapDepth;\n\t\t\t\t\t\t\tnumBlockers ++;\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\tif( numBlockers == 0 ) return -1.0;\n\n\t\t\t\t\treturn blockerDepthSum / float( numBlockers );\n\t\t\t\t}\n\n\t\t\t\tfloat PCF_Filter(sampler2D shadowMap, vec2 uv, float zReceiver, float filterRadius ) {\n\t\t\t\t\tfloat sum = 0.0;\n\t\t\t\t\tfor( int i = 0; i < PCF_NUM_SAMPLES; i ++ ) {\n\t\t\t\t\t\tfloat depth = unpackRGBAToDepth( texture2D( shadowMap, uv + poissonDisk[ i ] * filterRadius ) );\n\t\t\t\t\t\tif( zReceiver <= depth ) sum += 1.0;\n\t\t\t\t\t}\n\t\t\t\t\tfor( int i = 0; i < PCF_NUM_SAMPLES; i ++ ) {\n\t\t\t\t\t\tfloat depth = unpackRGBAToDepth( texture2D( shadowMap, uv + -poissonDisk[ i ].yx * filterRadius ) );\n\t\t\t\t\t\tif( zReceiver <= depth ) sum += 1.0;\n\t\t\t\t\t}\n\t\t\t\t\treturn sum / ( 2.0 * float( PCF_NUM_SAMPLES ) );\n\t\t\t\t}\n\n\t\t\t\tfloat PCSS ( sampler2D shadowMap, vec4 coords ) {\n\t\t\t\t\tvec2 uv = coords.xy;\n\t\t\t\t\tfloat zReceiver = coords.z; // Assumed to be eye-space z in this code\n\n\t\t\t\t\tinitPoissonSamples( uv );\n\t\t\t\t\t// STEP 1: blocker search\n\t\t\t\t\tfloat avgBlockerDepth = findBlocker( shadowMap, uv, zReceiver );\n\n\t\t\t\t\t//There are no occluders so early out (this saves filtering)\n\t\t\t\t\tif( avgBlockerDepth == -1.0 ) return 1.0;\n\n\t\t\t\t\t// STEP 2: penumbra size\n\t\t\t\t\tfloat penumbraRatio = penumbraSize( zReceiver, avgBlockerDepth );\n\t\t\t\t\tfloat filterRadius = penumbraRatio * LIGHT_SIZE_UV * NEAR_PLANE / zReceiver;\n\n\t\t\t\t\t// STEP 3: filtering\n\t\t\t\t\t//return avgBlockerDepth;\n\t\t\t\t\treturn PCF_Filter( shadowMap, uv, zReceiver, filterRadius );\n\t\t\t\t}\n\n\t\t"