import { useEffect } from "react";
import { Vector3, Color3 } from "@babylonjs/core";
import { Control } from "@babylonjs/gui/2D/controls/control";

interface MainMenu3DProps {
  onPlay: () => void;
  onSettings: () => void;
  onUpgrades: () => void;
  highScore: number;
}

export const MainMenu3D = ({ onPlay, onSettings, onUpgrades, highScore }: MainMenu3DProps) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).GAME_MENU = {
        clickPlay: onPlay,
        clickUpgrades: onUpgrades,
        clickSettings: onSettings
      };
    }
    return () => { delete (window as any).GAME_MENU; };
  }, [onPlay, onSettings, onUpgrades]);

  return (
    <>
      {/* Title Board (2D Texture on 3D Plane) */}
      {/* 
      <plane name="titlePlane" position={new Vector3(0, 3.5, 0)} scaling={new Vector3(10, 3, 1)}>
         <advancedDynamicTexture 
            name="titleADT" 
            createForParentMesh={true}
            width={1024}
            height={256}
         >
            <stackPanel isVertical={true} top={0} height="100%">
                <textBlock 
                    text="HOMESTEAD" 
                    color="#eab308" 
                    fontSize={120} 
                    fontFamily="Fredoka One"
                    fontStyle="bold"
                    outlineWidth={8}
                    outlineColor="#7f1d1d"
                    height="140px"
                />
                <textBlock 
                    text="HEADACHES" 
                    color="#eab308" 
                    fontSize={120} 
                    fontFamily="Fredoka One"
                    fontStyle="bold"
                    outlineWidth={8}
                    outlineColor="#7f1d1d"
                    height="140px"
                />
            </stackPanel>
         </advancedDynamicTexture>
      </plane>
      */}

      {/* High Score Board */}
      {/* 
      <plane name="scorePlane" position={new Vector3(0, 2, 0)} scaling={new Vector3(5, 1, 1)}>
         <advancedDynamicTexture 
            name="scoreADT" 
            createForParentMesh={true}
            width={512}
            height={128}
         >
            <textBlock 
                text={`BEST: ${highScore.toLocaleString()}`} 
                color="#fef9c3" 
                fontSize={60} 
                fontFamily="Nunito"
            />
         </advancedDynamicTexture>
      </plane>
      */}

      {/* 3D Buttons */}
      {/* reactylon <stackPanel3D> puts children in 3D stack */}
      {/* Position 0,0,0 is center. We might want to move it down/forward? */}
      <stackPanel3D 
        name="menuPanel" 
        position={new Vector3(0, -1, 0)} 
        margin={0.2}
        isVertical={true}
      >
         <holographicButton 
            name="btnNewGame" 
            text="NEW GAME" 
            onPointerClick={onPlay}
            scaling={new Vector3(2, 1, 1)}
         />
         <holographicButton 
            name="btnUpgrades" 
            text="UPGRADES" 
            onPointerClick={onUpgrades}
            scaling={new Vector3(1.5, 0.8, 1)}
         />
         <holographicButton 
            name="btnSettings" 
            text="SETTINGS" 
            onPointerClick={onSettings}
            scaling={new Vector3(1.5, 0.8, 1)}
         />
      </stackPanel3D>
    </>
  );
};
