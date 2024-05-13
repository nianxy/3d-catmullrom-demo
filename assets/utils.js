export function loadModel() {
  return new Promise(resolve => {
    const loader = new THREE.GLTFLoader();
    loader.load('/assets/res/test.glb', (gltf) => {
      console.log("model loaded", gltf);
      resolve(gltf);
    });
  })
}

export function loadEnvMap(renderer) {
  return new Promise(resolve => {
    const loader = new THREE.TextureLoader();
    loader.load('/assets/res/hdr.png', (texture) => {
      console.log("envmap loaded", texture);
      const generator = new THREE.PMREMGenerator(renderer);
      resolve(generator.fromEquirectangular(texture).texture);
      texture.dispose();
    });
  })
}
