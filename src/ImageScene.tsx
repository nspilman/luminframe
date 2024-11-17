// ImageScene.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.5);
  }
`;

interface ImageSceneProps {
  shader: string;
  inputVars: Record<string, string | number | number[] | THREE.Texture>;
  dimensions: [number, number];
}

// Separate component for the plane where we use Three.js hooks
function ImagePlane({
  shader,
  inputVars,
  dimensions
}: {
  shader: string;
  inputVars: Record<string, string | number | number[] | THREE.Texture>;
  dimensions: [number, number];
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => {
    // First, create base uniforms with time and image texture
    const baseUniforms = {
      time: { value: 0 },
    };

    // Then process additional uniforms from inputVars
    const additionalUniforms = Object.entries(inputVars).reduce((acc, [key, value]) => {
      // Handle different types of values
      if (Array.isArray(value)) {
        if (value.length === 2) {
          acc[key] = { value: new THREE.Vector2(...value) };
        } else if (value.length === 3) {
          acc[key] = { value: new THREE.Vector3(...value) };
        } else if (value.length === 4) {
          acc[key] = { value: new THREE.Vector4(...value) };
        }
      } else if (typeof value === 'number') {
        acc[key] = { value: value };
      } else if (typeof value === 'string') {
        acc[key] = { value: value };
      }
      else if (typeof value === 'object'){
        acc[key] = { value: value };
      }
      return acc;
    }, {} as Record<string, { value: any }>);

    return { ...baseUniforms, ...additionalUniforms };
  }, [inputVars]);

  return (
    <mesh>
      <planeGeometry 
        args={[(dimensions[0] / dimensions[1]) * 10, (dimensions[1] / dimensions[1]) * 10]} 
      />
      <shaderMaterial
        key={shader}
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={shader}
        uniforms={uniforms}
        transparent={true}
      />
    </mesh>
  );
}

// Main component that sets up the Canvas
export function ImageScene({ shader, inputVars, dimensions }: ImageSceneProps) {
  
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={1}
        style={{ width: "100%", height: "100%" }}
        gl={{ preserveDrawingBuffer: true }}
        key={shader}
      >
        <ImagePlane 
          shader={shader}
          dimensions={dimensions}
          inputVars={inputVars}
        />
      </Canvas>
    </div>
  );
}

// Example usage:
/*
import fragmentShader from "./shaders/fragment.frag";

const props = {
  shader: fragmentShader,
  inputVars: {
    imageTexture: "/path/to/image.jpg",
    resolution: [800, 600],
    pixelSize: 1.0,
    offset: 2.0
  },
  dimensions: [1920, 1080] as [number, number]
};

<ImageScene {...props} />
*/