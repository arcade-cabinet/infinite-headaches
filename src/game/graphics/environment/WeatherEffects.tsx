/**
 * Weather Effects - BabylonJS particle systems for rain/wind.
 * Respects reducedMotion (shows text indicator only).
 */

import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import {
  ParticleSystem,
  Texture,
  Vector3,
  Color4,
} from "@babylonjs/core";
import type { WeatherState } from "../../systems/WeatherSystem";

interface WeatherEffectsProps {
  weather: WeatherState;
  reducedMotion?: boolean;
}

export const WeatherEffects = ({ weather, reducedMotion = false }: WeatherEffectsProps) => {
  const scene = useScene();
  const rainSystemRef = useRef<ParticleSystem | null>(null);
  const windSystemRef = useRef<ParticleSystem | null>(null);

  useEffect(() => {
    if (!scene || reducedMotion) return;

    const hasRain = weather.type === "rainy" || weather.type === "stormy";
    const hasWind = weather.type === "windy" || weather.type === "stormy";

    // Rain particles
    if (hasRain && !rainSystemRef.current) {
      const rain = new ParticleSystem("rain", 500, scene);
      rain.createPointEmitter(new Vector3(-8, 0, -2), new Vector3(8, 0, 2));
      rain.emitter = new Vector3(0, 12, 0);
      rain.minSize = 0.02;
      rain.maxSize = 0.04;
      rain.minLifeTime = 0.5;
      rain.maxLifeTime = 1.0;
      rain.emitRate = 300 * weather.intensity;
      rain.gravity = new Vector3(weather.windDirection * weather.windStrength * 5, -20, 0);
      rain.color1 = new Color4(0.6, 0.7, 0.9, 0.6);
      rain.color2 = new Color4(0.4, 0.5, 0.8, 0.3);
      rain.blendMode = ParticleSystem.BLENDMODE_ADD;
      rain.start();
      rainSystemRef.current = rain;
    } else if (!hasRain && rainSystemRef.current) {
      rainSystemRef.current.dispose();
      rainSystemRef.current = null;
    } else if (hasRain && rainSystemRef.current) {
      rainSystemRef.current.emitRate = 300 * weather.intensity;
      rainSystemRef.current.gravity = new Vector3(weather.windDirection * weather.windStrength * 5, -20, 0);
    }

    // Wind streaks
    if (hasWind && !windSystemRef.current) {
      const wind = new ParticleSystem("wind", 100, scene);
      const emitDir = weather.windDirection > 0 ? 10 : -10;
      wind.createPointEmitter(new Vector3(0, -2, -2), new Vector3(0, 8, 2));
      wind.emitter = new Vector3(emitDir, 5, 0);
      wind.minSize = 0.01;
      wind.maxSize = 0.03;
      wind.minLifeTime = 0.3;
      wind.maxLifeTime = 0.8;
      wind.emitRate = 50 * weather.intensity;
      wind.gravity = new Vector3(weather.windDirection * 15, 0, 0);
      wind.color1 = new Color4(0.8, 0.8, 0.8, 0.3);
      wind.color2 = new Color4(0.9, 0.9, 0.9, 0.1);
      wind.blendMode = ParticleSystem.BLENDMODE_ADD;
      wind.start();
      windSystemRef.current = wind;
    } else if (!hasWind && windSystemRef.current) {
      windSystemRef.current.dispose();
      windSystemRef.current = null;
    } else if (hasWind && windSystemRef.current) {
      windSystemRef.current.emitRate = 50 * weather.intensity;
    }

    return () => {
      rainSystemRef.current?.dispose();
      rainSystemRef.current = null;
      windSystemRef.current?.dispose();
      windSystemRef.current = null;
    };
  }, [scene, weather.type, weather.intensity, weather.windDirection, weather.windStrength, reducedMotion]);

  return null;
};
