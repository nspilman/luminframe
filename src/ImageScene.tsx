// ImageScene.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useRef, useState, useEffect, useMemo } from "react";
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

interface ImageSceneProps {
  uploadedImage: string;
  selectedShader: string;
}

function ImagePlane({ uploadedImage, shader }: { uploadedImage: string, shader: string }) {
  const texture = useTexture(uploadedImage);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Get image dimensions and calculate aspect ratio
  const [aspectRatio, setAspectRatio] = useState(16/9); // default fallback
  
  useEffect(() => {
    const img = new Image();
    img.src = uploadedImage;
    img.onload = () => {
      setAspectRatio(img.width / img.height);
    };
  }, [uploadedImage]);

  // Maintain consistent width and adjust height based on aspect ratio
  const width = 16;
  const height = width / aspectRatio;

  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        key={shader}
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={shader}
        uniforms={{
          resolution: { value: [window.innerWidth, window.innerHeight] },
          imageTexture: { value: texture },
          time: { value: 0 },
          colorValue: { value: .5 }
        }}
      />
    </mesh>
  );
}

export function ImageScene({ uploadedImage, selectedShader }: ImageSceneProps) {
  // Get the correct shader based on selection
  const shader = useMemo(() => {
    switch (selectedShader) {
      case 'fragment':
        return fragmentShader;
      case 'whiteout':
        return whiteout;
      case 'blur':
        return blur;
      default:
        return fragmentShader;
    }
  }, [selectedShader]);

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={1}
        style={{ width: "100%", height: "100%" }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ImagePlane uploadedImage={uploadedImage} shader={shader} />
      </Canvas>
    </div>
  );
}
