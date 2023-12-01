import "./style.css"; // For webpack support

import initJank from "three/addons/offscreen/jank.js";
import init from "three/addons/offscreen/scene.js";

// onscreen

const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");

const width = canvas1.clientWidth;
const height = canvas1.clientHeight;
const pixelRatio = window.devicePixelRatio;

init(canvas1, width, height, pixelRatio, "three/examples/");
initJank();

// offscreen

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
let supportOffScreenWebGL = "transferControlToOffscreen" in canvas2;

// If it's Safari, then check the version because Safari < 17 doesn't support OffscreenCanvas with a WebGL context.
if (isSafari) {
  var versionMatch = navigator.userAgent.match(/version\/(\d+)/i);
  var safariVersion = versionMatch ? parseInt(versionMatch[1]) : 0;

  supportOffScreenWebGL = safariVersion >= 17;
}

if (supportOffScreenWebGL) {
  const offscreen = canvas2.transferControlToOffscreen();
  const worker = new Worker("jsm/offscreen/offscreen.js", { type: "module" });
  worker.postMessage(
    {
      drawingSurface: offscreen,
      width: canvas2.clientWidth,
      height: canvas2.clientHeight,
      pixelRatio: window.devicePixelRatio,
      path: ".three/examples/.three/examples/",
    },
    [offscreen]
  );
} else {
  document.getElementById("message").style.display = "block";
}
