import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("/player/setup", "routes/player.setup/route.tsx"),
  route("/decks", "routes/decks/route.tsx"),
  route("/rooms/:roomID", "routes/rooms.$roomID/route.tsx"),
  route("/game/:roomID", "routes/game.$roomID/route.tsx"),
] satisfies RouteConfig;
