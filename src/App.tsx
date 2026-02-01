import { GameScreen3D } from "./game/screens/GameScreen3D";
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
