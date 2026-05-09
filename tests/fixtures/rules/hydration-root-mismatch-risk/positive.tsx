import { renderToPipeableStream } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

const App = () => null;
renderToPipeableStream(<App />, { identifierPrefix: "server-a" });
hydrateRoot(document.getElementById("root")!, <App />, {
  identifierPrefix: "client-b",
});
