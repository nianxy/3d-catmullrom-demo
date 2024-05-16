import { cameraMotions } from './catmullRomMotions.js';
import { loadModel, loadEnvMap } from './utils.js';

const cameraParameters = {
  fov: 60,
  aspect: window.innerWidth / window.innerHeight,
  near: 0.1,
  far: 1000,
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
    this.canStart = true;
    TWEEN.getAll().forEach(tween => TWEEN.remove(tween));
    this.tweens = null;
    this.tween = null;
    this.clearDot();
  }

  addDot(position) {
    const dotIdx = this.currentDotNumber*3;
    const array = this.dotMesh.geometry.attributes.position.array;
    array[dotIdx] = position.x;
    array[dotIdx+1] = position.y;
    array[dotIdx+2] = position.z;

    this.currentDotNumber += 1;
    this.dotMesh.geometry.setDrawRange(0, this.currentDotNumber);
    this.dotMesh.geometry.attributes.position.needsUpdate = true;
  }

  clearDot() {
    this.currentDotNumber = 0;
    this.dotMesh.geometry.setDrawRange(0, 0);
  }

  gotoNode(idx) {
    console.log('go to node', idx);
    this.canStart = false;
    TWEEN.getAll().forEach(tween => TWEEN.remove(tween));
    this.tweens = null;
    this.tween = null;
    const m = cameraMotions[(idx-1)*2];
    if (m) {
      this.renderCamera.position.set(m.pos[0], m.pos[1], m.pos[2]);
      this.renderCamera.lookAt(0, 0, 0);
    }
  }

  updateCameraCatmullRom(camera) {
    if (!this.canStart) return;
    if (!this.tween) {
      const points = [];
      const quats = [];
      const durations = [];
      const easings = [];

      for (let i=0; i<cameraMotions.length; i+=2) {
        const point = cameraMotions[i];
        const transition = cameraMotions[i+1];
        if (!point) break;
        points.push(new THREE.Vector3().fromArray(point.pos));
        quats.push(new THREE.Quaternion(point.rot[0], point.rot[1], point.rot[2], point.rot[3]).normalize());
        if (transition) {
          durations.push(transition.dur);
          easings.push(transition.easing);
        }
      }
      console.log(quats);

      const catmullRom = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.2);

      let startPoint = 0;
      let lastTween = null;
      for (let i=0; i<durations.length; ++i) {
        const endPoint = (i+1) / durations.length;
        // console.log('time', startPoint, endPoint, durations[i]);
        const tween = new TWEEN.Tween([startPoint]).to([endPoint])
          .onUpdate(t=>{
            const p = catmullRom.getPoint(t[0]);
            camera.position.copy(p);
            this.addDot(camera.position);
          });
        tween.duration(durations[i] * 1000);
        if (easings[i]) {
          // console.log('easing', easings[i]);
          tween.easing(easings[i]);
        }
        if (!this.tween) {
          this.tween = tween;
          lastTween = tween;
        } else {
          lastTween.chain(tween);
          lastTween = tween;
        }
        startPoint = endPoint;
      }
      this.tween.start();
    } else {
      TWEEN.update();
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    this.helper.update();
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


    this.camera1 = camera1;
    this.camera2 = camera2;
    this.renderCamera = camera1;
    this.scene = scene;
    this.model = model;
    this.dlight = dlight;
    this.renderer = renderer;
    this.dotMesh = dotMesh;
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