const glbPath = '/assets/res/test.glb';
const envMapPath = '/assets/res/hdr.png';

export function loadModel() {
  return new Promise(resolve => {
    const loader = new THREE.GLTFLoader();
    loader.load(glbPath, (gltf) => {
      // console.log("model loaded", gltf);
      resolve(gltf);
    });
  })
}

export function loadEnvMap(renderer) {
  return new Promise(resolve => {
    const loader = new THREE.TextureLoader();
    loader.load(envMapPath, (texture) => {
      // console.log("envmap loaded", texture);
      const generator = new THREE.PMREMGenerator(renderer);
      resolve(generator.fromEquirectangular(texture).texture);
      texture.dispose();
    });
  })
}
