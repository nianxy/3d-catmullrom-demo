import { cameraMotions } from './cameraMotions.js';
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
    // console.log(rect);

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
      }
    });

    console.info('\n触摸屏幕或按空格键开始动画\n');
  }

  restartAnimation() {
    console.log('restart animation');
    this.canStart = true;
    TWEEN.getAll().forEach(tween => TWEEN.remove(tween));
    this.tweens = null;
  }

  updateCamera(camera) {
    if (!this.tweens) {
      for (let i=0; i<cameraMotions.length; i+=2) {
        const cameraStart = cameraMotions[i];
        const cameraMotion = cameraMotions[i + 1];
        const cameraNext = cameraMotions[i + 2];
        if (!cameraMotion || !cameraNext) {
          break;
        }
        const tweens = [
          new TWEEN.Tween(cameraStart.pos.clone()).to(cameraNext.pos.clone()).onUpdate(pos=>{camera.position.copy(pos);}),
          new TWEEN.Tween(cameraStart.rot.clone()).to(cameraNext.rot.clone()).onUpdate(rot=>{camera.quaternion.copy(rot);}),
        ];
        tweens.forEach(tween => {
          tween.duration(cameraMotion.dur * 1000);
          if (cameraMotion.easing) {
            tween.easing(cameraMotion.easing);
          }
        });
        if (!this.tweens) {
          this.tweens = tweens;
          camera.position.copy(cameraStart.pos);
          camera.quaternion.copy(cameraStart.rot);
        } else {
          this.tweens[0].chain(tweens[0]);
          this.tweens[1].chain(tweens[1]);
        }
      }
      this.tweens[0].start();
      this.tweens[1].start();
    } else {
      if (this.canStart) {
        TWEEN.update();
      }
    }
  }

  async initEngine() {
    const camera = new THREE.PerspectiveCamera(cameraParameters.fov, cameraParameters.aspect, cameraParameters.near, cameraParameters.far);
    // camera.position.set(0, 0, 5);
    // camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    renderer.setSize(this.canvas.width, this.canvas.height, false);
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // const geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const model = new THREE.Mesh(geometry, material);
    // model.position.set(0, 0, 0);
    // scene.add(model);

    const model = (await loadModel()).scene;
    scene.add(model);

    // load hdr
    scene.environment = await loadEnvMap(renderer);

    // add optional lights
    const enableLight = true;
    let dlight = null;
    if (enableLight) {
      dlight = new THREE.DirectionalLight( 0xffffff, 1.0 );
      dlight.position.copy(camera.position);
      dlight.target.position.set(0, 0, 0);
      scene.add( dlight );
    }

    this.camera = camera;
    this.scene = scene;
    this.model = model;
    this.dlight = dlight;
    this.renderer = renderer;
  }

  async run() {
    
    await this.initEngine();

    const animate = () => {
      requestAnimationFrame(animate);

      // this.model.rotation.x += 0.01;
      // this.model.rotation.y += 0.01;

      this.updateCamera(this.camera);
      if (this.dlight) {
        this.dlight.position.copy(this.camera.position);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}