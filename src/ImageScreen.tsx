// ImageScene.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import fragmentShader from "./shaders/fragment.frag"
import whiteout from "./shaders/white-out.frag"
import blur from "./shaders/blur.frag"

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.5);
  }
`;

// const fragmentShader = `
// uniform sampler2D imageTexture;
// uniform float time;
// varying vec2 vUv;

// vec4 firstEffect(vec4 color, vec2 uv) {
//     color.rgb *= sin(time + uv.x) + 1.0;
//     return color;
// }

// vec4 secondEffect(vec4 color, vec2 uv) {
//     vec2 distortedUv = uv;
//     distortedUv.x += tan(uv.y * 10.0 + time) * 0.01;
//     return texture2D(imageTexture, distortedUv);
// }

// void main() {
//     vec2 uv = vUv;
//     vec4 color = texture2D(imageTexture, uv);
    
//     // Chain effects
//     color = secondEffect(color, uv);
//     color = firstEffect(color, uv);
    
//     gl_FragColor = color;
// }
// `;

const images = {
    hoh: "/HohNationalForest-4.jpg",
    car: "/pink-car-space-needle4.jpg"
}

function ImagePlane() {
  const hohTexture = useTexture(images.hoh);
  const carTexture = useTexture(images.car);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[16, 9]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={blur}
        uniforms={{
            // imageOneTexture: { value: hohTexture },
            resolution: { value: [window.innerWidth, window.innerHeight] },
            imageTexture: {value: carTexture},
          time: { value: 100 },
          colorValue: { value: .5 }
        }}
      />
    </mesh>
  );
}

export default function ImageScene() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
        Hello
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ImagePlane />
      </Canvas>
    </div>
  );
}
