import { renderToPipeableStream } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

const App = () => null;
renderToPipeableStream(<App />, { identifierPrefix: "app-1" });
hydrateRoot(document.getElementById("root")!, <App />, {
  identifierPrefix: "app-1",
});
