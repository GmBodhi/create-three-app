import "./style.css"; // For webpack support

import {
  Clock,
  TextureLoader,
  RepeatWrapping,
  Vector2,
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Fog,
  Object3D,
  SphereGeometry,
  MeshPhongMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
} from "three";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { NodePass } from "three/examples/jsm/nodes/postprocessing/NodePass.js";
import * as Nodes from "three/examples/jsm/nodes/Nodes.js";

let camera, scene, renderer, composer;
let object, light, nodepass;
let gui;

const clock = new Clock();
const frame = new Nodes.NodeFrame();

const param = { example: "color-adjustment" };

const textureLoader = new TextureLoader();

const lensflare2 = textureLoader.load("textures/lensflare/lensflare0.png");
lensflare2.wrapS = lensflare2.wrapT = RepeatWrapping;

const decalNormal = textureLoader.load("textures/decal/decal-normal.jpg");
decalNormal.wrapS = decalNormal.wrapT = RepeatWrapping;

init();
animate();

function clearGui() {
  if (gui) gui.destroy();

  gui = new GUI();

  gui
    .add(param, "example", {
      "basic / color-adjustment": "color-adjustment",
      "basic / blends": "blends",
      "basic / fade": "fade",
      "basic / invert": "invert",
      "basic / blur": "blur",
      "adv / saturation": "saturation",
      "adv / refraction": "refraction",
      "adv / mosaic": "mosaic",
    })
    .onFinishChange(function () {
      updateMaterial();
    });

  gui.open();
}

function addGui(name, value, callback, isColor, min, max) {
  let node;

  param[name] = value;

  if (isColor) {
    node = gui.addColor(param, name).onChange(function () {
      callback(param[name]);
    });
  } else if (typeof value == "object") {
    param[name] = value[Object.keys(value)[0]];

    node = gui.add(param, name, value).onChange(function () {
      callback(param[name]);
    });
  } else {
    node = gui.add(param, name, min, max).onChange(function () {
      callback(param[name]);
    });
  }

  return node;
}

function updateMaterial() {
  const name = param.example;

  let screen, fade, scale;

  clearGui();

  switch (name) {
    case "color-adjustment":
      screen = new Nodes.ScreenNode();

      const hue = new Nodes.FloatNode();
      const sataturation = new Nodes.FloatNode(1);
      const vibrance = new Nodes.FloatNode();
      const brightness = new Nodes.FloatNode(0);
      const contrast = new Nodes.FloatNode(1);

      const hueNode = new Nodes.ColorAdjustmentNode(
        screen,
        hue,
        Nodes.ColorAdjustmentNode.HUE
      );
      const satNode = new Nodes.ColorAdjustmentNode(
        hueNode,
        sataturation,
        Nodes.ColorAdjustmentNode.SATURATION
      );
      const vibranceNode = new Nodes.ColorAdjustmentNode(
        satNode,
        vibrance,
        Nodes.ColorAdjustmentNode.VIBRANCE
      );
      const brightnessNode = new Nodes.ColorAdjustmentNode(
        vibranceNode,
        brightness,
        Nodes.ColorAdjustmentNode.BRIGHTNESS
      );
      const contrastNode = new Nodes.ColorAdjustmentNode(
        brightnessNode,
        contrast,
        Nodes.ColorAdjustmentNode.CONTRAST
      );

      nodepass.input = contrastNode;

      // GUI

      addGui(
        "hue",
        hue.value,
        function (val) {
          hue.value = val;
        },
        false,
        0,
        Math.PI * 2
      );

      addGui(
        "saturation",
        sataturation.value,
        function (val) {
          sataturation.value = val;
        },
        false,
        0,
        2
      );

      addGui(
        "vibrance",
        vibrance.value,
        function (val) {
          vibrance.value = val;
        },
        false,
        -1,
        1
      );

      addGui(
        "brightness",
        brightness.value,
        function (val) {
          brightness.value = val;
        },
        false,
        0,
        0.5
      );

      addGui(
        "contrast",
        contrast.value,
        function (val) {
          contrast.value = val;
        },
        false,
        0,
        2
      );

      break;

    case "fade":
      // PASS

      const color = new Nodes.ColorNode(0xffffff);
      const percent = new Nodes.FloatNode(0.5);

      fade = new Nodes.MathNode(
        new Nodes.ScreenNode(),
        color,
        percent,
        Nodes.MathNode.MIX
      );

      nodepass.input = fade;

      // GUI

      addGui(
        "color",
        color.value.getHex(),
        function (val) {
          color.value.setHex(val);
        },
        true
      );

      addGui(
        "fade",
        percent.value,
        function (val) {
          percent.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "invert":
      // PASS

      const alpha = new Nodes.FloatNode(1);

      screen = new Nodes.ScreenNode();
      const inverted = new Nodes.MathNode(screen, Nodes.MathNode.INVERT);

      fade = new Nodes.MathNode(screen, inverted, alpha, Nodes.MathNode.MIX);

      nodepass.input = fade;

      // GUI

      addGui(
        "alpha",
        alpha.value,
        function (val) {
          alpha.value = val;
        },
        false,
        0,
        1
      );

      break;

    case "blends":
      // PASS

      const multiply = new Nodes.OperatorNode(
        new Nodes.ScreenNode(),
        new Nodes.TextureNode(lensflare2),
        Nodes.OperatorNode.ADD
      );

      nodepass.input = multiply;

      // GUI

      addGui(
        "blend",
        {
          addition: Nodes.OperatorNode.ADD,
          subtract: Nodes.OperatorNode.SUB,
          multiply: Nodes.OperatorNode.MUL,
          division: Nodes.OperatorNode.DIV,
        },
        function (val) {
          multiply.op = val;

          nodepass.needsUpdate = true;
        }
      );

      break;

    case "saturation":
      // PASS

      screen = new Nodes.ScreenNode();
      const sat = new Nodes.FloatNode(0);

      const satrgb = new Nodes.FunctionNode(
        [
          "vec3 satrgb( vec3 rgb, float adjustment ) {",
          // include luminance function from LuminanceNode
          "	vec3 intensity = vec3( luminance( rgb ) );",
          "	return mix( intensity, rgb, adjustment );",
          "}",
        ].join("\n"),
        [Nodes.LuminanceNode.Nodes.luminance]
      );

      const saturation = new Nodes.FunctionCallNode(satrgb);
      saturation.inputs.rgb = screen;
      saturation.inputs.adjustment = sat;

      nodepass.input = saturation;

      // GUI

      addGui(
        "saturation",
        sat.value,
        function (val) {
          sat.value = val;
        },
        false,
        0,
        2
      );

      break;

    case "refraction":
      // PASS

      const normal = new Nodes.TextureNode(decalNormal);
      const normalXY = new Nodes.SwitchNode(normal, "xy");
      scale = new Nodes.FloatNode(0.5);

      const normalXYFlip = new Nodes.MathNode(normalXY, Nodes.MathNode.INVERT);

      const offsetNormal = new Nodes.OperatorNode(
        normalXYFlip,
        new Nodes.FloatNode(0.5),
        Nodes.OperatorNode.ADD
      );

      const scaleTexture = new Nodes.OperatorNode(
        new Nodes.SwitchNode(normal, "z"),
        offsetNormal,
        Nodes.OperatorNode.MUL
      );

      const scaleNormal = new Nodes.MathNode(
        new Nodes.FloatNode(1),
        scaleTexture,
        scale,
        Nodes.MathNode.MIX
      );

      const offsetCoord = new Nodes.OperatorNode(
        new Nodes.UVNode(),
        scaleNormal,
        Nodes.OperatorNode.MUL
      );

      screen = new Nodes.ScreenNode(offsetCoord);

      nodepass.input = screen;

      // GUI

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        0,
        1
      );

      addGui("invert", false, function (val) {
        offsetNormal.a = val ? normalXYFlip : normalXY;

        nodepass.needsUpdate = true;
      });

      break;

    case "mosaic":
      // PASS

      scale = new Nodes.FloatNode(128);
      fade = new Nodes.FloatNode(1);
      const uv = new Nodes.UVNode();

      const blocks = new Nodes.OperatorNode(uv, scale, Nodes.OperatorNode.MUL);

      const blocksSize = new Nodes.MathNode(blocks, Nodes.MathNode.FLOOR);

      const mosaicUV = new Nodes.OperatorNode(
        blocksSize,
        scale,
        Nodes.OperatorNode.DIV
      );

      const fadeScreen = new Nodes.MathNode(
        uv,
        mosaicUV,
        fade,
        Nodes.MathNode.MIX
      );

      nodepass.input = new Nodes.ScreenNode(fadeScreen);

      // GUI

      addGui(
        "scale",
        scale.value,
        function (val) {
          scale.value = val;
        },
        false,
        16,
        1024
      );

      addGui(
        "fade",
        fade.value,
        function (val) {
          fade.value = val;
        },
        false,
        0,
        1
      );

      addGui("mask", false, function (val) {
        fadeScreen.c = val ? new Nodes.TextureNode(lensflare2) : fade;

        nodepass.needsUpdate = true;
      });

      break;

    case "blur":
      // PASS

      const size = renderer.getDrawingBufferSize(new Vector2());

      const blurScreen = new Nodes.BlurNode(new Nodes.ScreenNode());
      blurScreen.size = new Vector2(size.width, size.height);

      nodepass.input = blurScreen;

      // GUI

      addGui(
        "blurX",
        blurScreen.radius.x,
        function (val) {
          blurScreen.radius.x = val;
        },
        false,
        0,
        15
      );

      addGui(
        "blurY",
        blurScreen.radius.y,
        function (val) {
          blurScreen.radius.y = val;
        },
        false,
        0,
        15
      );

      break;
  }

  nodepass.needsUpdate = true;

  // test serialization
  /*
							let library = {};
							library[ lensflare2.uuid ] = lensflare2;
							library[ decalNormal.uuid ] = decalNormal;

							let json = nodepass.toJSON();

							nodepass.input = new Nodes.NodeMaterialLoader( null, library ).parse( json ).value;
						*/
}

function init() {
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 400;

  scene = new Scene();
  scene.fog = new Fog(0x0066ff, 1, 1000);

  object = new Object3D();
  scene.add(object);

  const geometry = new SphereGeometry(1, 4, 4);

  for (let i = 0; i < 100; i++) {
    const material = new MeshPhongMaterial({
      color: 0x888888 + Math.random() * 0x888888,
      flatShading: true,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize();
    mesh.position.multiplyScalar(Math.random() * 400);
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 10 + Math.random() * 40;
    object.add(mesh);
  }

  scene.add(new AmbientLight(0x999999));

  light = new DirectionalLight(0xffffff);
  light.position.set(1, 1, 1);
  scene.add(light);

  // postprocessing

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  nodepass = new NodePass();

  composer.addPass(nodepass);

  //

  updateMaterial();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  object.rotation.x += 0.005;
  object.rotation.y += 0.01;

  frame.update(delta).updateNode(nodepass.material);

  composer.render();
}
