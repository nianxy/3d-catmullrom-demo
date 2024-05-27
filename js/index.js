import { cameraMotions } from './catmullRomMotions.js';
import { loadModel, loadEnvMap } from './utils.js';

const cameraParameters = {
  fov: 60,
  aspect: window.innerWidth / window.innerHeight,
  near: 0.1,
  far: 1000,
}

function recusivePauseTween(tween) {
  // console.log('pause tween', tween.isPlaying, tween.isPaused, tween._chainedTweens);
  if (tween.isPlaying() && !tween.isPaused()) {
    tween.pause();
  } else if (tween._chainedTweens) {
    tween._chainedTweens.forEach(t => recusivePauseTween(t));
  }
}

function recusiveResumeTween(tween) {
  if (tween.isPlaying() && tween.isPaused()) {
    tween.resume();
  } else if (tween._chainedTweens) {
    tween._chainedTweens.forEach(t => recusiveResumeTween(t));
  }
}

export class Demo {
  constructor(container) {
    if (typeof THREE === 'undefined') {
      throw new Error('THREE is not defined');
    }

    const canvas = document.createElement('canvas');

    const rect = container.getBoundingClientRect();

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style = `width: ${rect.width}px; height: ${rect.height}px;`;

    container.appendChild(canvas);

    this.canvas = canvas;
    this.canStart = false;

    canvas.addEventListener('touchstart', this.restartAnimation.bind(this));
    window.addEventListener('keypress', key => {
      if (key.code === 'Space') {
        this.restartAnimation();
      } else {
        const charCode = key.key.charCodeAt(0);
        if (charCode >= 48 && charCode <= 57) {
          this.gotoNode(charCode - 48);
        }
      }
    });

    console.info('\n触摸屏幕或按空格键开始动画\n');
  }

  restartAnimation() {
    console.log('restart animation');
    this.tweenGroup.getAll().forEach(tween => tween.stop());
    this.canStart = true;
    this.currentMotionIndex = 0;
    this.paused = false;
    this.tween.start();
  }

  addDot(position, needUpdate) {
    const dotIdx = this.currentDotNumber*3;
    const array = this.dotMesh.geometry.attributes.position.array;
    array[dotIdx] = position.x;
    array[dotIdx+1] = position.y;
    array[dotIdx+2] = position.z;

    this.currentDotNumber += 1;
    this.dotMesh.geometry.setDrawRange(0, this.currentDotNumber);
    if (needUpdate) {
      this.dotMesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  addDots(positions) {
    for (let i=0; i<positions.length; ++i) {
      this.addDot(positions[i], i===positions.length-1);
    }
  }

  clearDot() {
    this.currentDotNumber = 0;
    this.dotMesh.geometry.setDrawRange(0, 0);
  }

  addMarker(position, needUpdate) {
    const markerIdx = this.currentMarkerNumber*3;
    const array = this.markerMesh.geometry.attributes.position.array;
    array[markerIdx] = position.x;
    array[markerIdx+1] = position.y;
    array[markerIdx+2] = position.z;

    this.currentMarkerNumber += 1;
    this.markerMesh.geometry.setDrawRange(0, this.currentMarkerNumber);
    if (needUpdate) {
      this.markerMesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  addMarkers(positions) {
    for (let i=0; i<positions.length; ++i) {
      this.addMarker(positions[i], i===positions.length-1);
    }
  }

  clearMarker() {
    this.currentMarkerNumber = 0;
    this.markerMesh.geometry.setDrawRange(0, 0);
  }

  gotoNode(idx) {
    console.log('go to node', idx);
    idx--;
    this.canStart = false;
    this.tweenGroup.getAll().forEach(tween => tween.stop());
    let n = 0;
    for (let i=0; i<cameraMotions.length; ++i) {
      if (idx>=n && idx<=n+cameraMotions[i].length/2) {
        // console.log('in scope', idx, n, i);
        const m = cameraMotions[i][(idx-n)*2];
        if (m) {
          this.renderCamera.position.set(m.pos[0], m.pos[1], m.pos[2]);
          this.renderCamera.quaternion.set(m.rot[0], m.rot[1], m.rot[2], m.rot[3]);
        }
      }
      n += Math.floor(cameraMotions[i].length/2);
    }
  }

  updateCameraCatmullRom() {
    if (!this.canStart) return;
    this.tweenGroup.update();
  }

  _setProgress(t, inAnimation) {
    // console.log('t', t.toFixed(3));
    
    const p = this.catmullRoms[this.currentMotionIndex].getPoint(t);
    this.camera2.position.copy(p);

    // update camera rotation
    const q0 = this.cameraQuats[this.currentMotionIndex][this.currentTweenIndex];
    const q1 = this.cameraQuats[this.currentMotionIndex][this.currentTweenIndex+1];
    const p0 = this.cameraPoints[this.currentMotionIndex][this.currentTweenIndex];
    const p1 = this.cameraPoints[this.currentMotionIndex][this.currentTweenIndex+1];
    const d1 = p.distanceTo(p0);
    const d2 = p.distanceTo(p1);
    const tt = d1 / (d1 + d2);
    this.camera2.quaternion.slerpQuaternions(q0, q1, tt);
    
    this.camera2.updateProjectionMatrix();
    this.helper.update();
    this.onProgressUpdateCallback?.(t, !!inAnimation);
  }

  setProgressOutside(t) {
    this._setProgress(t, false);
  }

  captureCameraParams() {
    let pos = new THREE.Vector3();
    let quat = new THREE.Quaternion();
    let sacle = new THREE.Vector3();
    this.renderCamera.matrixWorld.decompose(pos, quat, sacle);
    console.log(`{ pos: [${pos.x}, ${pos.y}, ${pos.z}], rot: [${quat.x}, ${quat.y}, ${quat.z}, ${quat.w}] }`)
  }

  switchCamera() {
    if (this.renderCamera === this.camera1) {
      this.renderCamera = this.camera2;
      this.cameraControl.enabled = false;
    } else {
      this.renderCamera = this.camera1;
      this.cameraControl.enabled = true;
    }
  }

  alignCamera() {
    this.camera1.position.copy(this.camera2.position);
    this.camera1.quaternion.copy(this.camera2du.quaternion);
  }

  togglePause() {
    if (!this.paused) {
      recusivePauseTween(this.tween);
      this.paused = true;
    } else {
      recusiveResumeTween(this.tween);
      this.paused = false;
    }
  }

  onProgressUpdate(callback) {
    this.onProgressUpdateCallback = callback;
  }

  buildCatmullRom(motions, motionIndex) {
    const points = [];
    const quats = [];
    const durations = [];
    const easings = [];

    for (let i=0; i<motions.length; i+=2) {
      const point = motions[i];
      const transition = motions[i+1];
      if (!point) break;
      points.push(new THREE.Vector3().fromArray(point.pos));
      quats.push(new THREE.Quaternion(point.rot[0], point.rot[1], point.rot[2], point.rot[3]).normalize());
      if (transition) {
        durations.push(transition.dur);
        easings.push(transition.easing);
      }
    }

    const catmullRom = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.2);
    this.addMarkers(points);
    this.addDots(catmullRom.getPoints(200));

    let startPoint = 0;
    for (let i=0; i<durations.length; ++i) {
      const endPoint = (i+1) / durations.length;
      const subTween = new TWEEN.Tween({t:startPoint}, this.tweenGroup).to({t:endPoint})
        .onUpdate(({t})=>{
          this._setProgress(t, true);
        });
        subTween.duration(durations[i] * 1000);
      subTween.easing(easings[i] || TWEEN.Easing.Linear.None);
      subTween.onStart(()=>{
        if (i===0) {
          this.currentMotionIndex = motionIndex;
          console.log('motion start', motionIndex);
        }
        this.currentTweenIndex = i;
        console.log('tween seg:', i);
      });
      if (!this.tween) {
        this.tween = subTween;
        this.lastTween = subTween;
      } else {
        this.lastTween.chain(subTween);
        this.lastTween = subTween;
      }
      startPoint = endPoint;
    }

    this.catmullRoms.push(catmullRom);
    this.cameraPoints.push(points);
    this.cameraQuats.push(quats);
  }

  buildCatmullRoms() {
    this.tweenGroup = new TWEEN.Group();
    this.catmullRoms = [];
    this.cameraPoints = [];
    this.cameraQuats = [];
    for (let i=0; i<cameraMotions.length; ++i) {
      this.buildCatmullRom(cameraMotions[i], i);
    }
  }

  async initEngine() {

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    renderer.setSize(this.canvas.width, this.canvas.height, false);
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera1 = new THREE.PerspectiveCamera(cameraParameters.fov, cameraParameters.aspect, cameraParameters.near, cameraParameters.far);
    camera1.position.set(1.32, 1.22, -2.28);
    camera1.lookAt(0, 0, 0);
    scene.add(camera1);

    const camera2 = new THREE.PerspectiveCamera(cameraParameters.fov, cameraParameters.aspect, cameraParameters.near, cameraParameters.far);
    const helper = new THREE.CameraHelper( camera2 );
    this.helper = helper;
    scene.add( camera2 );
    scene.add( helper );

    const model = (await loadModel()).scene;
    scene.add(model);

    // load hdr
    scene.environment = await loadEnvMap(renderer);

    // add optional lights
    const enableLight = true;
    let dlight = null;
    if (enableLight) {
      dlight = new THREE.DirectionalLight( 0xffffff, 1.0 );
      dlight.position.copy(camera2.position);
      dlight.target.position.set(0, 0, 0);
      scene.add( dlight );
    }

    // add dot geo
    const dotGeometry = new THREE.BufferGeometry();
    this.maxDotNumber = 1000;
    this.currentDotNumber = 0;
    dotGeometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(3*this.maxDotNumber), 3 ) );
    const dotMaterial = new THREE.PointsMaterial( { size: 2, sizeAttenuation: false, color: 0xff0000 } );
    const dotMesh = new THREE.Points( dotGeometry, dotMaterial );
    scene.add( dotMesh );

    // add marker geo
    const markerGeometry = new THREE.BufferGeometry();
    this.maxMarkerNumber = 100;
    this.currentMarkerNumber = 0;
    markerGeometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(3*this.maxMarkerNumber), 3 ) );
    const markerMaterial = new THREE.PointsMaterial( { size: 8, sizeAttenuation: false, color: 0x0000ff } );
    const markerMesh = new THREE.Points( markerGeometry, markerMaterial );
    scene.add( markerMesh );

    // add camera control
    // const cameraControl = new THREE.OrbitControls( camera1, renderer.domElement );
    const cameraControl = new THREE.ArcballControls( camera1, renderer.domElement );

    this.cameraControl = cameraControl;
    this.camera1 = camera1;
    this.camera2 = camera2;
    this.renderCamera = camera1;
    this.scene = scene;
    this.model = model;
    this.dlight = dlight;
    this.renderer = renderer;
    this.dotMesh = dotMesh;
    this.markerMesh = markerMesh;

    this.buildCatmullRoms();
  }

  async run() {
    
    await this.initEngine();

    const animate = () => {
      requestAnimationFrame(animate);

      this.updateCameraCatmullRom(this.camera2);
      if (this.dlight) {
        this.dlight.position.copy(this.camera2.position);
      }

      this.renderer.render(this.scene, this.renderCamera);
    };

    animate();
  }
}