import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  luminance,
  cos,
  min,
  time,
  atan,
  uniform,
  pass,
  PI,
  PI2,
  color,
  positionLocal,
  sin,
  texture,
  Fn,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, postProcessing, controls;

init();

function init() {
  camera = new PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.set(1, 1, 3);

  scene = new Scene();

  // textures

  const textureLoader = new TextureLoader();
  const perlinTexture = textureLoader.load(
    "three/examples/textures/noises/perlin/rgb-256x256.png"
  );
  perlinTexture.wrapS = RepeatWrapping;
  perlinTexture.wrapT = RepeatWrapping;

  // TSL functions

  const toRadialUv = Fn(([uv, multiplier, rotation, offset]) => {
    const centeredUv = uv.sub(0.5).toVar();
    const distanceToCenter = centeredUv.length();
    const angle = atan(centeredUv.y, centeredUv.x);
    const radialUv = vec2(angle.add(PI).div(PI2), distanceToCenter).toVar();
    radialUv.mulAssign(multiplier);
    radialUv.x.addAssign(rotation);
    radialUv.y.addAssign(offset);

    return radialUv;
  });

  const toSkewedUv = Fn(([uv, skew]) => {
    return vec2(uv.x.add(uv.y.mul(skew.x)), uv.y.add(uv.x.mul(skew.y)));
  });

  const twistedCylinder = Fn(
    ([position, parabolStrength, parabolOffset, parabolAmplitude, time]) => {
      const angle = atan(position.z, position.x).toVar();
      const elevation = position.y;

      // parabol
      const radius = parabolStrength
        .mul(position.y.sub(parabolOffset))
        .pow(2)
        .add(parabolAmplitude)
        .toVar();

      // turbulences
      radius.addAssign(
        sin(elevation.sub(time).mul(20).add(angle.mul(2))).mul(0.05)
      );

      const twistedPosition = vec3(
        cos(angle).mul(radius),
        elevation,
        sin(angle).mul(radius)
      );

      return twistedPosition;
    }
  );

  // uniforms

  const emissiveColor = uniform(color("#ff8b4d"));
  const timeScale = uniform(0.2);
  const parabolStrength = uniform(1);
  const parabolOffset = uniform(0.3);
  const parabolAmplitude = uniform(0.2);

  // tornado floor

  const floorMaterial = new MeshBasicNodeMaterial({
    transparent: true,
    wireframe: false,
  });

  floorMaterial.outputNode = Fn(() => {
    const scaledTime = time.mul(timeScale);

    // noise 1
    const noise1Uv = toRadialUv(uv(), vec2(0.5, 0.5), scaledTime, scaledTime);
    noise1Uv.assign(toSkewedUv(noise1Uv, vec2(-1, 0)));
    noise1Uv.mulAssign(vec2(4, 1));
    const noise1 = texture(perlinTexture, noise1Uv, 1).r.remap(0.45, 0.7);

    // noise 2
    const noise2Uv = toRadialUv(
      uv(),
      vec2(2, 8),
      scaledTime.mul(2),
      scaledTime.mul(8)
    );
    noise2Uv.assign(toSkewedUv(noise2Uv, vec2(-0.25, 0)));
    noise2Uv.mulAssign(vec2(2, 0.25));
    const noise2 = texture(perlinTexture, noise2Uv, 1).b.remap(0.45, 0.7);

    // outer fade
    const distanceToCenter = uv().sub(0.5).toVar();
    const outerFade = min(
      distanceToCenter.length().oneMinus().smoothstep(0.5, 0.9),
      distanceToCenter.length().smoothstep(0, 0.2)
    );

    // effect
    const effect = noise1.mul(noise2).mul(outerFade).toVar();

    // output
    return vec4(
      emissiveColor.mul(effect.step(0.2)).mul(3), // Emissive
      effect.smoothstep(0, 0.01) // Alpha
    );
  })();

  const floor = new Mesh(new PlaneGeometry(2, 2), floorMaterial);
  floor.rotation.x = -Math.PI * 0.5;
  scene.add(floor);

  // tornado cylinder geometry

  const cylinderGeometry = new CylinderGeometry(1, 1, 1, 20, 20, true);
  cylinderGeometry.translate(0, 0.5, 0);

  // tornado emissive cylinder

  const emissiveMaterial = new MeshBasicNodeMaterial({
    transparent: true,
    side: DoubleSide,
    wireframe: false,
  });

  emissiveMaterial.positionNode = twistedCylinder(
    positionLocal,
    parabolStrength,
    parabolOffset,
    parabolAmplitude.sub(0.05),
    time.mul(timeScale)
  );

  emissiveMaterial.outputNode = Fn(() => {
    const scaledTime = time.mul(timeScale);

    // noise 1
    const noise1Uv = uv().add(vec2(scaledTime, scaledTime.negate())).toVar();
    noise1Uv.assign(toSkewedUv(noise1Uv, vec2(-1, 0)));
    noise1Uv.mulAssign(vec2(2, 0.25));
    const noise1 = texture(perlinTexture, noise1Uv, 1).r.remap(0.45, 0.7);

    // noise 2
    const noise2Uv = uv()
      .add(vec2(scaledTime.mul(0.5), scaledTime.negate()))
      .toVar();
    noise2Uv.assign(toSkewedUv(noise2Uv, vec2(-1, 0)));
    noise2Uv.mulAssign(vec2(5, 1));
    const noise2 = texture(perlinTexture, noise2Uv, 1).g.remap(0.45, 0.7);

    // outer fade
    const outerFade = min(
      uv().y.smoothstep(0, 0.1),
      uv().y.oneMinus().smoothstep(0, 0.4)
    );

    // effect
    const effect = noise1.mul(noise2).mul(outerFade);

    const emissiveColorLuminance = luminance(emissiveColor);

    // output
    return vec4(
      emissiveColor.mul(1.2).div(emissiveColorLuminance), // emissive
      effect.smoothstep(0, 0.1) // alpha
    );
  })();

  const emissive = new Mesh(cylinderGeometry, emissiveMaterial);
  emissive.scale.set(1, 1, 1);
  scene.add(emissive);

  // tornado dark cylinder

  const darkMaterial = new MeshBasicNodeMaterial({
    transparent: true,
    side: DoubleSide,
    wireframe: false,
  });

  darkMaterial.positionNode = twistedCylinder(
    positionLocal,
    parabolStrength,
    parabolOffset,
    parabolAmplitude,
    time.mul(timeScale)
  );

  darkMaterial.outputNode = Fn(() => {
    const scaledTime = time.mul(timeScale).add(123.4);

    // noise 1
    const noise1Uv = uv().add(vec2(scaledTime, scaledTime.negate())).toVar();
    noise1Uv.assign(toSkewedUv(noise1Uv, vec2(-1, 0)));
    noise1Uv.mulAssign(vec2(2, 0.25));
    const noise1 = texture(perlinTexture, noise1Uv, 1).g.remap(0.45, 0.7);

    // noise 2
    const noise2Uv = uv()
      .add(vec2(scaledTime.mul(0.5), scaledTime.negate()))
      .toVar();
    noise2Uv.assign(toSkewedUv(noise2Uv, vec2(-1, 0)));
    noise2Uv.mulAssign(vec2(5, 1));
    const noise2 = texture(perlinTexture, noise2Uv, 1).b.remap(0.45, 0.7);

    // outer fade
    const outerFade = min(
      uv().y.smoothstep(0, 0.2),
      uv().y.oneMinus().smoothstep(0, 0.4)
    );

    // effect
    const effect = noise1.mul(noise2).mul(outerFade);

    return vec4(vec3(0), effect.smoothstep(0, 0.01));
  })();

  const dark = new Mesh(cylinderGeometry, darkMaterial);
  dark.scale.set(1, 1, 1);
  scene.add(dark);

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setClearColor(0x201919);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  // post processing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode("output");

  const bloomPass = bloom(scenePassColor, 1, 0.1, 1);

  postProcessing.outputNode = scenePassColor.add(bloomPass);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.y = 0.4;
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;

  window.addEventListener("resize", onWindowResize);

  // debug

  const gui = new GUI();

  gui
    .addColor(
      { color: emissiveColor.value.getHexString(SRGBColorSpace) },
      "color"
    )
    .onChange((value) => emissiveColor.value.set(value))
    .name("emissiveColor");
  gui.add(timeScale, "value", -1, 1, 0.01).name("timeScale");
  gui.add(parabolStrength, "value", 0, 2, 0.01).name("parabolStrength");
  gui.add(parabolOffset, "value", 0, 1, 0.01).name("parabolOffset");
  gui.add(parabolAmplitude, "value", 0, 2, 0.01).name("parabolAmplitude");

  const bloomGui = gui.addFolder("bloom");
  bloomGui.add(bloomPass.strength, "value", 0, 10, 0.01).name("strength");
  bloomGui.add(bloomPass.radius, "value", 0, 1, 0.01).name("radius");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  controls.update();

  postProcessing.render();
}
