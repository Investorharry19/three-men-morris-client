# Three Men's Morris

Three Men's Morris is a two-player, real-time strategy game. The React client
uses Socket.IO to communicate with the Node.js game server.

## Run locally

1. Install dependencies in both `client` and `server` with `npm ci`.
2. Copy `client/.env.example` to `client/.env`.
3. In separate terminals, run `npm run dev` from `server` and `npm run dev`
   from `client`.
4. Open the Vite URL (usually `http://localhost:5173`) in two browser windows
   to play.

## Deploy

Deploy the client and server as separate services. The client is a static Vite
site; the server must support persistent WebSocket connections.

### Client

- Set the service root to `client`.
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to the public HTTPS URL of the server (for example,
  `https://your-game-server.example.com`), then rebuild and redeploy.

### Server

- Set the service root to `server`.
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Set `REMOTE_CLIENT_URL` to the deployed client origin, without a trailing
  slash. Multiple client origins can be comma-separated.
- The server listens on the platform-provided `PORT` and exposes `/health` for
  health checks.
- Interactive API documentation is available at `/api-docs`; the OpenAPI
  document is at `/api-docs.json`. Socket.IO events are described in Swagger.

`VITE_API_URL` is embedded into the client at build time. Changing it requires
a new client build. The server reads `PORT` and `REMOTE_CLIENT_URL` from its
environment; set them in the hosting provider rather than committing a `.env`
file. The server keeps active matches in memory, so a server restart or sleep
ends those matches; run a single always-on server instance for reliable live
games.
