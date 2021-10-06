import "./style.css"; // For webpack support

import {
  Clock,
  WebGLRenderer,
  Scene,
  Fog,
  PerspectiveCamera,
  TextureLoader,
  RepeatWrapping,
  Sprite,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  NodeMaterialLoader,
  NodeMaterialLoaderUtils,
} from "three/examples/jsm/loaders/NodeMaterialLoader.js";

import {
  NodeFrame,
  SpriteNodeMaterial,
  MathNode,
  OperatorNode,
  TextureNode,
  Vector2Node,
  TimerNode,
  FunctionNode,
  FunctionCallNode,
  PositionNode,
  UVNode,
} from "three/examples/jsm/nodes/Nodes.js";

const container = document.getElementById("container");

let renderer, scene, camera;
const clock = new Clock(),
  fov = 50;
const frame = new NodeFrame();
let sprite1, sprite2, sprite3;
let walkingManTexture, walkingManTextureURL;
const library = {};
let controls;

window.addEventListener("load", init);

function init() {
  //
  // Renderer / Controls
  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  scene = new Scene();
  scene.fog = new Fog(0x0000ff, 70, 150);

  camera = new PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 100;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 50;
  controls.maxDistance = 200;

  //
  // SpriteNode
  //

  // https://openclipart.org/detail/239883/walking-man-sprite-sheet
  walkingManTextureURL = "textures/WalkingManSpriteSheet.png";

  walkingManTexture = new TextureLoader().load(walkingManTextureURL);
  walkingManTexture.wrapS = walkingManTexture.wrapT = RepeatWrapping;

  library[walkingManTextureURL] = walkingManTexture;

  // horizontal sprite-sheet animator

  function createHorizontalSpriteSheetNode(hCount, speed) {
    const speedNode = new Vector2Node(speed, 0); // frame per second
    const scale = new Vector2Node(1 / hCount, 1); // 8 horizontal images in sprite-sheet

    const uvTimer = new OperatorNode(
      new TimerNode(),
      speedNode,
      OperatorNode.MUL
    );

    const uvIntegerTimer = new MathNode(uvTimer, MathNode.FLOOR);

    const uvFrameOffset = new OperatorNode(
      uvIntegerTimer,
      scale,
      OperatorNode.MUL
    );

    const uvScale = new OperatorNode(new UVNode(), scale, OperatorNode.MUL);

    const uvFrame = new OperatorNode(uvScale, uvFrameOffset, OperatorNode.ADD);

    return uvFrame;
  }

  // sprites

  const spriteWidth = 20,
    spriteHeight = 20;

  scene.add((sprite1 = new Sprite(new SpriteNodeMaterial())));
  sprite1.scale.x = spriteWidth;
  sprite1.scale.y = spriteHeight;
  sprite1.material.color = new TextureNode(walkingManTexture);
  sprite1.material.color.uv = createHorizontalSpriteSheetNode(8, 10);

  scene.add((sprite2 = new Sprite(new SpriteNodeMaterial())));
  sprite2.position.x = 30;
  sprite2.scale.x = spriteWidth;
  sprite2.scale.y = spriteHeight;
  sprite2.material.color = new TextureNode(walkingManTexture);
  sprite2.material.color.uv = createHorizontalSpriteSheetNode(8, 30);
  sprite2.material.color = new MathNode(
    sprite2.material.color,
    MathNode.INVERT
  );
  sprite2.material.spherical = false; // look at camera horizontally only, very used in vegetation
  // horizontal zigzag sprite
  sprite2.material.position = new OperatorNode(
    new OperatorNode(
      new MathNode(new TimerNode(3), MathNode.SIN), // 3 is speed (time scale)
      new Vector2Node(0.3, 0), // horizontal scale (position)
      OperatorNode.MUL
    ),
    new PositionNode(),
    OperatorNode.ADD
  );

  const sineWaveFunction = new FunctionNode(
    [
      // https://stackoverflow.com/questions/36174431/how-to-make-a-wave-warp-effect-in-shader
      "vec2 sineWave(vec2 uv, vec2 phase) {",
      // wave distortion
      "	float x = sin( 25.0*uv.y + 30.0*uv.x + 6.28*phase.x) * 0.01;",
      "	float y = sin( 25.0*uv.y + 30.0*uv.x + 6.28*phase.y) * 0.03;",
      "	return vec2(uv.x+x, uv.y+y);",
      "}",
    ].join("\n")
  );

  scene.add((sprite3 = new Sprite(new SpriteNodeMaterial())));
  sprite3.position.x = -30;
  sprite3.scale.x = spriteWidth;
  sprite3.scale.y = spriteHeight;
  sprite3.material.color = new TextureNode(walkingManTexture);
  sprite3.material.color.uv = new FunctionCallNode(sineWaveFunction, {
    uv: createHorizontalSpriteSheetNode(8, 10),
    phase: new TimerNode(),
  });
  sprite3.material.fog = true;

  //
  //	Test serialization
  //

  spriteToJSON(sprite1);
  spriteToJSON(sprite2);
  spriteToJSON(sprite3);

  //
  // Events
  //

  window.addEventListener("resize", onWindowResize);

  onWindowResize();
  animate();
}

function spriteToJSON(sprite) {
  // serialize

  const json = sprite.material.toJSON();

  // replace uuid to url (facilitates the load of textures using url otherside uuid)

  NodeMaterialLoaderUtils.replaceUUID(
    json,
    walkingManTexture,
    walkingManTextureURL
  );

  // deserialize

  const material = new NodeMaterialLoader(null, library).parse(json);

  // replace material

  sprite.material.dispose();

  sprite.material = material;
}

function onWindowResize() {
  const width = window.innerWidth,
    height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  const delta = clock.getDelta();

  // update material animation and/or gpu calcs (pre-renderer)
  frame
    .update(delta)
    .updateNode(sprite1.material)
    .updateNode(sprite2.material)
    .updateNode(sprite3.material);

  // rotate sprite
  sprite3.rotation.z -= Math.PI * 0.005;

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}
