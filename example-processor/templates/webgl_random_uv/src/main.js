import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  ACESFilmicToneMapping,
  VSMShadowMap,
  DirectionalLight,
  CameraHelper,
  PlaneGeometry,
  Mesh,
  ShadowMaterial,
  TextureLoader,
  SRGBColorSpace,
  RepeatWrapping,
  EquirectangularReflectionMapping,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera,
  scene,
  renderer,
  dirLight,
  ground,
  gui,
  material,
  materialIn,
  uniforms,
  uniformsIn;

init();
render();

function init() {
  const container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    20
  );
  camera.position.set(-0.8, 0.6, 1.5);

  scene = new Scene();

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.7;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap;
  container.appendChild(renderer.domElement);

  dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.position.set(-0.5, 1, 0.8);
  dirLight.castShadow = true;
  scene.add(dirLight);
  let shadow = dirLight.shadow;
  shadow.mapSize.width = shadow.mapSize.height = 1024;
  shadow.radius = 16;
  shadow.bias = -0.0005;
  let shadowCam = shadow.camera,
    s = 2;
  shadowCam.near = 0.5;
  shadowCam.far = 3;
  shadowCam.right = shadowCam.top = s;
  shadowCam.left = shadowCam.bottom = -s;
  // debug shadow
  //scene.add( new CameraHelper(shadowCam) );

  // add ground plane
  let plane = new PlaneGeometry(2, 2);
  plane.rotateX(-Math.PI * 0.5);
  ground = new Mesh(plane, new ShadowMaterial({ opacity: 0.5 }));
  ground.receiveShadow = true;
  ground.position.z = -0.5;
  scene.add(ground);

  const map = new TextureLoader().load("textures/jade.jpg");
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(20, 20);
  map.flipY = false;

  const disolveMap = new TextureLoader().load("textures/shaderball_ds.jpg");
  disolveMap.flipY = false;

  const noise = new TextureLoader().load("textures/noise.png");

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("lobe.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;
      scene.backgroundBlurriness = 0.5;
      scene.backgroundIntensity = 1.0;
      scene.environmentIntensity = 1.5;

      render();

      // model

      const loader = new GLTFLoader().setPath("models/gltf/");
      loader.setDRACOLoader(
        new DRACOLoader().setDecoderPath("jsm/libs/draco/gltf/")
      );
      loader.load("ShaderBall2.glb", function (gltf) {
        const shaderBall = gltf.scene.children[0];

        // shaderBall is a groop with 3 children : base, inside and logo
        // ao map is include in model

        let i = shaderBall.children.length,
          n = 0;

        while (i--) {
          shaderBall.children[i].receiveShadow = true;
          shaderBall.children[i].castShadow = true;
          shaderBall.children[i].renderOrder = n++;
        }

        material = shaderBall.children[0].material;
        material.map = map;
        material.alphaMap = disolveMap;
        material.transparent = true;

        materialIn = shaderBall.children[1].material;
        materialIn.alphaMap = disolveMap;
        materialIn.transparent = true;

        material.onBeforeCompile = function (shader) {
          shader.uniforms["disolve"] = { value: 0 };
          shader.uniforms["threshold"] = { value: 0.2 };

          shader.uniforms["noiseMap"] = { value: noise };
          shader.uniforms["enableRandom"] = { value: 1 };
          shader.uniforms["useNoiseMap"] = { value: 1 };
          shader.uniforms["useSuslikMethod"] = { value: 0 };
          shader.uniforms["debugNoise"] = { value: 0 };

          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <clipping_planes_pars_fragment>",
            "#include <clipping_planes_pars_fragment>" + randomUV
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            mapRemplace
          );

          // for disolve
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphamap_pars_fragment>",
            alphamap_pars_fragment
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphamap_fragment>",
            alphamap_fragment
          );

          uniforms = shader.uniforms;
        };

        materialIn.onBeforeCompile = function (shader) {
          shader.uniforms["disolve"] = { value: 0 };
          shader.uniforms["threshold"] = { value: 0.2 };
          // for disolve
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphamap_pars_fragment>",
            alphamap_pars_fragment
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphamap_fragment>",
            alphamap_fragment
          );

          uniformsIn = shader.uniforms;
        };

        scene.add(shaderBall);

        render();

        createGUI();
      });
    });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use if there is no animation loop
  controls.minDistance = 0.3;
  controls.maxDistance = 10;
  controls.target.set(0, 0.4, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function createGUI() {
  const setting = {
    get Enabled() {
      return uniforms.enableRandom.value ? true : false;
    },
    set Enabled(v) {
      uniforms.enableRandom.value = v ? 1 : 0;
      render();
    },

    get UseNoiseMap() {
      return uniforms.useNoiseMap.value ? true : false;
    },
    set UseNoiseMap(v) {
      uniforms.useNoiseMap.value = v ? 1 : 0;
      render();
    },

    get SuslikMethod() {
      return uniforms.useSuslikMethod.value ? true : false;
    },
    set SuslikMethod(v) {
      uniforms.useSuslikMethod.value = v ? 1 : 0;
      render();
    },

    get DebugNoise() {
      return uniforms.debugNoise.value ? true : false;
    },
    set DebugNoise(v) {
      uniforms.debugNoise.value = v ? 1 : 0;
      render();
    },

    // disolve
    get disolve() {
      return uniforms.disolve.value;
    },
    set disolve(v) {
      uniforms.disolve.value = v;
      uniformsIn.disolve.value = v;
      ground.material.opacity = (1 - v) * 0.5;
      render();
    },

    get threshold() {
      return uniforms.threshold.value;
    },
    set threshold(v) {
      uniforms.threshold.value = v;
      uniformsIn.threshold.value = v;
      render();
    },
  };

  gui = new GUI();
  gui.add(material, "roughness", 0, 1, 0.01).onChange(render);
  gui.add(material, "metalness", 0, 1, 0.01).onChange(render);
  gui.add(setting, "disolve", 0, 1, 0.01).onChange(render);
  gui.add(setting, "threshold", 0, 1, 0.01).onChange(render);
  gui.add(setting, "Enabled");
  gui.add(setting, "UseNoiseMap");
  gui.add(setting, "SuslikMethod");
  gui.add(setting, "DebugNoise");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

//

function render() {
  renderer.render(scene, camera);
}

const randomUV = /* glsl */ `

			uniform sampler2D noiseMap;
			uniform float enableRandom;
			uniform float useNoiseMap;
			uniform float debugNoise;
			uniform float useSuslikMethod;

			float directNoise(vec2 p){
			    vec2 ip = floor(p);
			    vec2 u = fract(p);
			    u = u*u*(3.0-2.0*u);
			    
			    float res = mix(
			        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
			        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
			    return res*res;
			}

			float sum( vec4 v ) { return v.x+v.y+v.z; }

			vec4 textureNoTile( sampler2D mapper, in vec2 uv ){

			    // sample variation pattern
			    float k = 0.0;
			    if( useNoiseMap == 1.0 ) k = texture2D( noiseMap, 0.005*uv ).x;
			    else k = directNoise( uv );
			    
			    // compute index    
			    float index = k*8.0;
			    float f = fract( index );
			    float ia = 0.0;
			    float ib = 0.0;

			    if( useSuslikMethod == 1.0 ){
			    	ia = floor(index+0.5);
			    	ib = floor(index);
			    	f = min(f, 1.0-f)*2.0;
			    } else {
			    	ia = floor( index );
			    	ib = ia + 1.0;
			    }

			    // offsets for the different virtual patterns    
			    vec2 offa = sin(vec2(3.0,7.0)*ia); // can replace with any other hash    
			    vec2 offb = sin(vec2(3.0,7.0)*ib); // can replace with any other hash    

			    // compute derivatives for mip-mapping    
			    vec2 dx = dFdx(uv);
			    vec2 dy = dFdy(uv);
			    
			    // sample the two closest virtual patterns    
			    vec4 cola = textureGrad( mapper, uv + offa, dx, dy );
			    vec4 colb = textureGrad( mapper, uv + offb, dx, dy );
			    if( debugNoise == 1.0 ){
			    	cola = vec4( 0.1,0.0,0.0,1.0 );
			    	colb = vec4( 0.0,0.0,1.0,1.0 );
			    }

			    // interpolate between the two virtual patterns    
			    return mix( cola, colb, smoothstep(0.2,0.8,f-0.1*sum(cola-colb)) );

			}`;

const mapRemplace = /* glsl */ `
			#ifdef USE_MAP

				if( enableRandom == 1.0 ) diffuseColor *= textureNoTile( map, vMapUv );
				else diffuseColor *= texture2D( map, vMapUv );

			#endif
			`;

const alphamap_pars_fragment = /* glsl */ `
			#ifdef USE_ALPHAMAP
				uniform sampler2D alphaMap;
				uniform float disolve;
				uniform float threshold;
			#endif
			`;

const alphamap_fragment = /* glsl */ `
			#ifdef USE_ALPHAMAP
			    float vv = texture2D( alphaMap, vAlphaMapUv ).g;
			    float r = disolve * (1.0 + threshold * 2.0) - threshold;
			    float mixf = clamp((vv - r)*(1.0/threshold), 0.0, 1.0);
				diffuseColor.a = mixf;
			#endif
			`;
