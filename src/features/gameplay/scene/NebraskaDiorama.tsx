/**
 * NebraskaDiorama - Quality-tiered 3D environment for Homestead Headaches
 * 
 * Clean, bright cartoon Nebraska farm environment.
 * NO storm logic. Uses PBR materials and high-quality environment textures.
 */

import { QualityLevel, useGraphics } from "@/graphics";
import { EnvironmentDome, NebraskaGround, PostProcessEffects, Lighting } from "@/game/graphics/environment";

interface NebraskaDioramaProps {
  quality: QualityLevel;
}

export const NebraskaDiorama = ({ quality }: NebraskaDioramaProps) => {
  const { settings } = useGraphics();

  return (
    <>
      <Lighting quality={quality} />
      {/* Replaced CartoonSky with EnvironmentDome (HDRI) */}
      <EnvironmentDome quality={quality} />
      <NebraskaGround quality={quality} />
      <PostProcessEffects quality={quality} colorblindMode={settings.colorblindMode ?? "none"} highContrastMode={settings.highContrastMode} />
    </>
  );
};

export default NebraskaDiorama;
