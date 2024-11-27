// ImageScene.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { ShaderInputVars } from '@/types/shader'

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 2);
  }
`;

interface ImageSceneProps {
  shader: string;
  inputVars: ShaderInputVars;
  dimensions: [number, number];
}

// Separate component for the plane where we use Three.js hooks
function ImagePlane({
  shader,
  inputVars,
  dimensions
}: {
  shader: string;
  inputVars: ShaderInputVars;
  dimensions: [number, number];
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => {
    const baseUniforms = {
      time: { value: 0 },
    };

    const additionalUniforms = Object.entries(inputVars).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 2) {
          acc[key] = { value: new THREE.Vector2(...value) };
        } else if (value.length === 3) {
          acc[key] = { value: new THREE.Vector3(...value) };
        } else if (value.length === 4) {
          acc[key] = { value: new THREE.Vector4(...value) };
        }
      } else if (typeof value === 'number') {
        acc[key] = { value };
      } else if (typeof value === 'string') {
        acc[key] = { value };
      }
      else if (typeof value === 'object'){
        acc[key] = { value };
      }
      else if(typeof value === 'boolean'){
        acc[key] = {value}
      }
      return acc;
    }, {} as Record<string, { value: any }>);

    return { ...baseUniforms, ...additionalUniforms };
  }, [inputVars]);

  function calculateAspectRatio(dimensions: [number, number]): [number, number] {
    const [width, height] = dimensions;
    const maxAllowed = 20;
    const scale = maxAllowed / Math.max(width, height);
    
    return [
        Math.round(width * scale),
        Math.round(height * scale)
    ];
}


const dims = calculateAspectRatio(dimensions)
  return (
    <mesh>
      <planeGeometry 
        args={dims} 
      />
      <shaderMaterial
        key={shader+JSON.stringify(inputVars)}
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
  // Calculate aspect ratio for the container
  const [width, height] = dimensions
  const aspectRatio = (height / width) * 100

  return (
    <div className="w-full relative" style={{ paddingBottom: `${aspectRatio}%` }}>
      <div className="absolute inset-0 bg-black">
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