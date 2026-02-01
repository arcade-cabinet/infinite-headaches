import { GameScreen3D } from "./features/core/GameScreen3D";
import { ThemeProvider } from "./theme";
import { GraphicsProvider } from "./graphics";

function App() {
  return (
    <ThemeProvider>
      <GraphicsProvider>
        <GameScreen3D />
      </GraphicsProvider>
    </ThemeProvider>
  );
}

export default App;
