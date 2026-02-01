import { useEffect, useRef } from "react";
import { Scene, useScene } from "reactylon";
import { Vector3, Color4, VideoTexture, StandardMaterial, Color3, MeshBuilder, Texture, FreeCamera } from "@babylonjs/core";

interface SplashSceneProps {
  onComplete: () => void;
}

// Internal component to handle the Texture logic within the Scene context
const SplashContent = ({ onComplete }: { onComplete: () => void }) => {
  const scene = useScene();
  const planeRef = useRef<any>(null);
  
  useEffect(() => {
    if (!scene) return;

    // Detect orientation
    const isPortrait = window.innerHeight > window.innerWidth;
    const videoSrc = isPortrait
      ? "/assets/video/splash_portrait.mp4"
      : "/assets/video/splash_landscape.mp4";

    // Create VideoTexture
    const videoTexture = new VideoTexture(
      "splashVideo",
      videoSrc,
      scene,
      true, // generateMipMaps
      false, // invertY
      Texture.TRILINEAR_SAMPLINGMODE,
      {
        autoPlay: true,
        muted: true,
        loop: false,
        autoUpdateTexture: true,
      }
    );

    // Completion handler
    videoTexture.video.onended = () => {
      onComplete();
    };

    // Fallback
    const timeout = setTimeout(() => {
        if (videoTexture.video.currentTime === 0 && videoTexture.video.readyState < 3) {
            console.warn("Splash video timed out or stalled, skipping.");
            onComplete();
        }
    }, 8000);

    // Material
    const material = new StandardMaterial("splashMat", scene);
    material.diffuseTexture = videoTexture;
    material.emissiveColor = Color3.White();
    material.disableLighting = true;

    // Plane setup
    const camera = scene.activeCamera;
    if (camera) {
        const distance = 10;
        const videoAspect = isPortrait ? 9/16 : 16/9;
        
        const height = 10;
        const width = height * videoAspect; 
        
        const plane = MeshBuilder.CreatePlane("splashPlane", { width, height }, scene);
        plane.material = material;
        plane.position = new Vector3(0, 0, distance);
        plane.rotation = Vector3.Zero();

        // Lock camera
        camera.position = Vector3.Zero();
        if ("setTarget" in camera) {
            (camera as any).setTarget(Vector3.Forward());
        }
        
        plane.position = new Vector3(0, 0, 8.5);
        
        const screenAspect = window.innerWidth / window.innerHeight;
        if (screenAspect > videoAspect) {
             const scale = screenAspect / videoAspect;
             plane.scaling = new Vector3(scale, scale, 1);
        } else {
             const scale = videoAspect / screenAspect;
             plane.scaling = new Vector3(scale, scale, 1);
        }

        planeRef.current = plane;
    }

    // Skip input
    const onSkip = () => onComplete();
    const canvas = scene.getEngine().getRenderingCanvas();
    canvas?.addEventListener("pointerdown", onSkip);

    return () => {
        clearTimeout(timeout);
        canvas?.removeEventListener("pointerdown", onSkip);
        videoTexture.dispose();
        material.dispose();
        if (planeRef.current) planeRef.current.dispose();
    };
  }, [scene, onComplete]);

  return null; // Camera handled procedurally
};

export const SplashScene = ({ onComplete, ...props }: SplashSceneProps & { [key: string]: any }) => {
  return (
    <Scene 
        {...props} 
        onSceneReady={(scene) => { 
            scene.clearColor = new Color4(0, 0, 0, 1); 
            // Create camera procedurally to satisfy Reactylon check
            if (!scene.activeCamera) {
                const camera = new FreeCamera("splashCam", Vector3.Zero(), scene);
                scene.activeCamera = camera;
                camera.setTarget(Vector3.Forward());
            }
        }}
    >
      <SplashContent onComplete={onComplete} />
    </Scene>
  );
};