import { useEffect, useRef } from "react";
import { Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, StackPanel, TextBlock } from "@babylonjs/gui";
import { useScene } from "reactylon";

interface SignboardProps {
  name: string;
  position: Vector3;
  scaling: Vector3;
  textLines: { text: string; color: string; size: number }[];
  width: number;
  height: number;
}

const Signboard = ({ name, position, scaling, textLines, width, height }: SignboardProps) => {
  const scene = useScene();
  const planeRef = useRef<any>(null);

  useEffect(() => {
    if (!planeRef.current || !scene) return;

    // Create ADT imperatively to avoid Reactylon nesting issues with CreateForMesh
    const adt = AdvancedDynamicTexture.CreateForMesh(
      planeRef.current,
      width,
      height,
      false // supportPointerMove
    );

    const panel = new StackPanel();
    panel.isVertical = true;
    panel.top = 0;
    adt.addControl(panel);

    textLines.forEach((line) => {
      const textBlock = new TextBlock();
      textBlock.text = line.text;
      textBlock.color = line.color;
      textBlock.fontSize = line.size;
      textBlock.fontFamily = "Fredoka One";
      textBlock.fontStyle = "bold";
      textBlock.height = `${line.size + 20}px`;
      textBlock.outlineWidth = 8;
      textBlock.outlineColor = "#7f1d1d";
      panel.addControl(textBlock);
    });

    return () => {
      adt.dispose();
    };
  }, [scene, width, height, JSON.stringify(textLines)]); // Re-create if props change

  return <plane name={name} position={position} scaling={scaling} ref={planeRef} />;
};

interface MainMenu3DProps {
  onPlay: () => void;
  onSettings: () => void;
  onUpgrades: () => void;
  highScore: number;
}

export const MainMenu3D = ({ onPlay, onSettings, onUpgrades, highScore }: MainMenu3DProps) => {
  // Expose API for E2E tests
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
      {/* Title Board */}
      <Signboard 
        name="titlePlane" 
        position={new Vector3(0, 3.5, 0)} 
        scaling={new Vector3(10, 3, 1)}
        width={1024}
        height={256}
        textLines={[
            { text: "HOMESTEAD", color: "#eab308", size: 120 },
            { text: "HEADACHES", color: "#eab308", size: 120 }
        ]}
      />

      {/* High Score Board */}
      <Signboard 
        name="scorePlane" 
        position={new Vector3(0, 2, 0)} 
        scaling={new Vector3(5, 1, 1)}
        width={512}
        height={128}
        textLines={[
            { text: `BEST: ${highScore.toLocaleString()}`, color: "#fef9c3", size: 60 }
        ]}
      />

      {/* 3D Buttons - Using standard Reactylon components */}
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