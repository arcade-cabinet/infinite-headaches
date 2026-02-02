/**
 * Weather System
 * Manages dynamic weather transitions that affect gameplay.
 * Clear for levels 1-5, then random weather every 30-60s.
 */

export type WeatherType = "clear" | "windy" | "rainy" | "stormy";

export interface WeatherState {
  type: WeatherType;
  intensity: number; // 0-1
  windDirection: number; // -1 to 1 (left to right)
  windStrength: number; // 0-1
  wobbleBonus: number; // added to base wobble
  duration: number; // total duration in ms
  elapsed: number; // time elapsed in current weather
  transitionProgress: number; // 0-1, 0=fully old, 1=fully new
}

const WEATHER_CONFIGS: Record<Exclude<WeatherType, "clear">, {
  windRange: [number, number];
  wobbleBonus: number;
  intensity: number;
}> = {
  windy: {
    windRange: [0.3, 0.7],
    wobbleBonus: 0.01,
    intensity: 0.5,
  },
  rainy: {
    windRange: [0.1, 0.3],
    wobbleBonus: 0.015,
    intensity: 0.7,
  },
  stormy: {
    windRange: [0.5, 1.0],
    wobbleBonus: 0.025,
    intensity: 1.0,
  },
};

const TRANSITION_DURATION = 2000; // 2s transitions
const MIN_WEATHER_DURATION = 30000;
const MAX_WEATHER_DURATION = 60000;

export class WeatherSystem {
  private state: WeatherState = {
    type: "clear",
    intensity: 0,
    windDirection: 0,
    windStrength: 0,
    wobbleBonus: 0,
    duration: Infinity,
    elapsed: 0,
    transitionProgress: 1,
  };

  private nextWeather: WeatherType | null = null;
  private gameLevel = 1;
  private rng: () => number;
  private onChangeCallback: ((weather: WeatherState) => void) | null = null;

  constructor(rng: () => number) {
    this.rng = rng;
  }

  onWeatherChange(callback: (weather: WeatherState) => void): void {
    this.onChangeCallback = callback;
  }

  setLevel(level: number): void {
    this.gameLevel = level;
    // If level is 5 or below, force clear weather immediately to prevent stale storms
    if (level <= 5 && this.state.type !== "clear") {
      this.state = {
        type: "clear",
        intensity: 0,
        windDirection: 0,
        windStrength: 0,
        wobbleBonus: 0,
        duration: Infinity,
        elapsed: 0,
        transitionProgress: 1,
      };
      this.onChangeCallback?.(this.state);
    }
  }

  getState(): WeatherState {
    return { ...this.state };
  }

  /** Horizontal wind force to apply to falling entities. */
  getWindForce(): number {
    return this.state.windDirection * this.state.windStrength * this.state.intensity;
  }

  /** Extra wobble to add during weather. */
  getWobbleBonus(): number {
    return this.state.wobbleBonus * this.state.intensity;
  }

  update(deltaMs: number): void {
    // No weather for early levels
    if (this.gameLevel <= 5) return;

    this.state.elapsed += deltaMs;

    // Handle transition
    if (this.state.transitionProgress < 1) {
      this.state.transitionProgress = Math.min(1, this.state.transitionProgress + deltaMs / TRANSITION_DURATION);
      this.state.intensity = this.state.transitionProgress * this.getBaseIntensity(this.state.type);
    }

    // Check if weather should change
    if (this.state.elapsed >= this.state.duration) {
      this.transitionToNewWeather();
    }
  }

  private getBaseIntensity(type: WeatherType): number {
    if (type === "clear") return 0;
    return WEATHER_CONFIGS[type].intensity;
  }

  private transitionToNewWeather(): void {
    const types: WeatherType[] = ["clear", "windy", "rainy", "stormy"];
    // Higher levels favor worse weather
    const stormyChance = Math.min(0.3, (this.gameLevel - 5) * 0.015);
    const rainyChance = Math.min(0.3, (this.gameLevel - 5) * 0.02);
    const windyChance = 0.3;
    const clearChance = Math.max(0.1, 1 - stormyChance - rainyChance - windyChance);

    const roll = this.rng();
    let selected: WeatherType;
    if (roll < clearChance) {
      selected = "clear";
    } else if (roll < clearChance + windyChance) {
      selected = "windy";
    } else if (roll < clearChance + windyChance + rainyChance) {
      selected = "rainy";
    } else {
      selected = "stormy";
    }

    // Avoid repeating the same weather
    if (selected === this.state.type && types.length > 1) {
      const others = types.filter((t) => t !== selected);
      selected = others[Math.floor(this.rng() * others.length)];
    }

    const duration = MIN_WEATHER_DURATION + this.rng() * (MAX_WEATHER_DURATION - MIN_WEATHER_DURATION);

    if (selected === "clear") {
      this.state = {
        type: "clear",
        intensity: 0,
        windDirection: 0,
        windStrength: 0,
        wobbleBonus: 0,
        duration,
        elapsed: 0,
        transitionProgress: 1,
      };
    } else {
      const config = WEATHER_CONFIGS[selected];
      const windStr = config.windRange[0] + this.rng() * (config.windRange[1] - config.windRange[0]);
      const windDir = this.rng() > 0.5 ? 1 : -1;

      this.state = {
        type: selected,
        intensity: 0,
        windDirection: windDir,
        windStrength: windStr,
        wobbleBonus: config.wobbleBonus,
        duration,
        elapsed: 0,
        transitionProgress: 0,
      };
    }

    this.onChangeCallback?.(this.state);
  }

  reset(): void {
    this.state = {
      type: "clear",
      intensity: 0,
      windDirection: 0,
      windStrength: 0,
      wobbleBonus: 0,
      duration: Infinity,
      elapsed: 0,
      transitionProgress: 1,
    };
    this.gameLevel = 1;
  }
}
