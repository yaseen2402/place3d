import "./createPost.js";

import {
  Devvit,
  useState,
  useAsync,
  useWebView,
  useChannel,
} from "@devvit/public-api";

import type { DevvitMessage, WebViewMessage } from "./message.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
  realtime: true,
});

function sessionId(): string {
  let id = "";
  const asciiZero = "0".charCodeAt(0);
  for (let i = 0; i < 4; i++) {
    id += String.fromCharCode(Math.floor(Math.random() * 26) + asciiZero);
  }
  return id;
}

interface CubeData {
  x: number;
  y: number;
  z: number;
  color: string;
  username: string;
}

// Key for the Redis hash that stores all cubes
const CUBES_HASH_KEY = "game_cubes";

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "Web View Example",
  height: "tall",
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? "anon";
    });

    const { data: cubes, loading: cubesLoading } = useAsync(
      async () => (await context.redis.hGetAll(CUBES_HASH_KEY)) ?? []
    );

    const channel = useChannel({
      name: "cube_updates",
      onMessage: (cubeData: any) => {
        // Update the web view with the new cube data
        console.log(
          "sending updateCube postMessage from real time onMessage handler to webview",
          cubeData
        );
        webView.postMessage({
          type: "updateCubes",
          data: {
            cubes: cubeData, // Send the entire cubes object
          },
        });
      },
    });

    // Subscribe to the channel
    channel.subscribe();

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      // URL of your web view content
      url: "page.html",

      // Handle messages sent from the web view
      async onMessage(message, webView) {
        switch (message.type) {
          case "webViewReady":
            if (!cubesLoading) {
              webView.postMessage({
                type: "initialData",
                data: {
                  username: username,
                  cubes: cubes,
                },
              });
            }
            break;
          case "saveCubes":
            console.log("Saving cubes:", message.data);
            const cubeId = `${message.data.x}_${message.data.y}_${message.data.z}`;

            // Store the cube data in Redis
            await context.redis.hSet(CUBES_HASH_KEY, {
              [cubeId]: JSON.stringify(message.data),
            });

            // Broadcast the update to all clients
            await context.realtime.send("cube_updates", message.data);

            break;
          default:
            throw new Error(`Unknown message type: ${message satisfies never}`);
        }
      },
      onUnmount() {
        context.ui.showToast("Web view closed!");
      },
    });

    // Render the custom post type
    return (
      <vstack grow padding="small">
        <vstack grow alignment="middle center">
          <text size="xlarge" weight="bold">
            Example App
          </text>
          <spacer />
          <vstack alignment="start middle">
            <hstack>
              <text size="medium">Username:</text>
              <text size="medium" weight="bold">
                {" "}
                {username ?? ""}
              </text>
            </hstack>
            <hstack>
              <text size="medium">Current counter:</text>
              <text size="medium" weight="bold">
                {" "}
                {/* {"counter" ?? ''} */}
              </text>
            </hstack>
          </vstack>
          <spacer />
          <button onPress={() => webView.mount()}>Launch App</button>
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;
