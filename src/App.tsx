import { GameScreen } from "./game/screens/GameScreen";
import { ThemeProvider } from "./theme";
import { GraphicsProvider } from "./graphics";

function App() {
  return (
    <ThemeProvider>
      <GraphicsProvider>
        <GameScreen />
      </GraphicsProvider>
    </ThemeProvider>
  );
}

export default App;
