const cameraParameters = {
  fov: 60,
  aspect: window.innerWidth / window.innerHeight,
  near: 0.1,
  far: 1000,
}

const cameraNodes = [
  {
    pos: new THREE.Vector3(-0.06, 0, 0.64),
    rot: new THREE.Quaternion(0, -0.05, 0, 1),
  },
];

class Demo {
  constructor(container) {
    if (typeof THREE === 'undefined') {
      throw new Error('THREE is not defined');
    }

    const canvas = document.createElement('canvas');

    const rect = container.getBoundingClientRect();
    console.log(rect);

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style = `width: ${rect.width}px; height: ${rect.height}px;`;

    container.appendChild(canvas);

    this.canvas = canvas;
  }

  loadModel() {
    return new Promise(resolve => {
      const loader = new THREE.GLTFLoader();
      loader.load('assets/models/test.glb', (gltf) => {
        console.log("model loaded", gltf);
        resolve(gltf);
      });
    })
  }

  async run() {
    const model = await this.loadModel();

    const initialCameraNode = cameraNodes[0];
    
    console.log(cameraParameters);
    const camera = new THREE.PerspectiveCamera(cameraParameters.fov, cameraParameters.aspect, cameraParameters.near, cameraParameters.far);
    camera.position.copy(initialCameraNode.pos);
    camera.applyQuaternion(initialCameraNode.rot);
    // camera.position.set(0, 0, 5);
    // camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    renderer.setSize(this.canvas.width, this.canvas.height, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // const geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new THREE.Mesh(geometry, material);
    // cube.position.set(0, 0, 0);
    // scene.add(cube);

    scene.add(model.scene);

    const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light.position.copy(camera.position);
    light.target.position.set(0, 0, 0);
    scene.add( light );

    const animate = function () {
      requestAnimationFrame(animate);

      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;

      renderer.render(scene, camera);
    };

    console.log('start rendering');
    animate();
  }
}