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

// Add this constant at the top with other constants
const COOLDOWN_SECONDS = 20;

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "Web View Example",
  height: "tall",
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? "anon";
    });
    const postId = context.postId;
    const CUBES_HASH_KEY = `game_cubes_${postId}`;

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
            console.log("webViewReady message sent");
            break;
          case "checkCooldown": {
            console.log("======= COOLDOWN CHECK STARTED =======");
            console.log("Checking cooldown for user:", username);
            console.log("Request data:", message.data);
            const checkCooldownKey = `user_${username}_cooldown`;
            console.log("Cooldown key:", checkCooldownKey);

            // Check if the key exists in Redis
            try {
              console.log("Checking if cooldown key exists in Redis");
              const cooldownExists = await context.redis.exists(
                checkCooldownKey
              );
              console.log(
                "Cooldown exists?",
                cooldownExists,
                "(type:",
                typeof cooldownExists,
                ")"
              );

              if (cooldownExists) {
                console.log("Cooldown key exists, getting expiry timestamp");
                try {
                  const expiryTimestamp = await context.redis.expireTime(
                    checkCooldownKey
                  );
                  console.log(
                    "Raw expiry timestamp:",
                    expiryTimestamp,
                    "(type:",
                    typeof expiryTimestamp,
                    ")"
                  );

                  const currentTime = Math.floor(Date.now() / 1000);
                  console.log("Current time (unix seconds):", currentTime);

                  const remainingSeconds = expiryTimestamp - currentTime;
                  console.log(
                    "Calculated remaining seconds:",
                    remainingSeconds
                  );

                  if (remainingSeconds > 0) {
                    console.log(
                      "Cooldown is active, sending cooldownActive message"
                    );
                    console.log("Remaining seconds:", remainingSeconds);
                    webView.postMessage({
                      type: "cooldownActive",
                      data: {
                        remainingSeconds: remainingSeconds,
                      },
                    });
                    console.log("cooldownActive message sent");
                    console.log(
                      "======= COOLDOWN CHECK ENDED (ACTIVE) ======="
                    );
                    return;
                  } else {
                    console.log(
                      "Cooldown exists but is expired (remainingSeconds <= 0)"
                    );
                  }
                } catch (error) {
                  console.error("Error getting expiry time:", error);
                }
              } else {
                console.log("No cooldown found for this user");
              }

              console.log("No active cooldown, proceeding with cube placement");
              // No cooldown active, proceed with cube placement
              const cubeData = message.data;
              console.log("Cube data received:", cubeData);
              const cubeId = `${cubeData.x}_${cubeData.y}_${cubeData.z}`;
              console.log("Generated cube ID:", cubeId);

              console.log("Saving cube data to Redis");
              try {
                await context.redis.hSet(CUBES_HASH_KEY, {
                  [cubeId]: JSON.stringify(cubeData),
                });
                console.log("Cube data saved successfully");
              } catch (error) {
                console.error("Error saving cube data:", error);
              }

              // Set cooldown
              console.log("Setting new cooldown for user:", username);
              try {
                console.log(`Setting key ${checkCooldownKey} to value "1"`);
                await context.redis.set(checkCooldownKey, "1");
                console.log(
                  `Setting expire time for ${checkCooldownKey} to ${COOLDOWN_SECONDS} seconds`
                );
                await context.redis.expire(checkCooldownKey, COOLDOWN_SECONDS);

                // Verify the cooldown was set correctly
                const verifyExists = await context.redis.exists(
                  checkCooldownKey
                );
                console.log(
                  "Verify cooldown key exists after setting:",
                  verifyExists
                );

                if (verifyExists) {
                  const verifyExpiry = await context.redis.expireTime(
                    checkCooldownKey
                  );
                  console.log("Verify cooldown expiry set to:", verifyExpiry);
                  console.log(
                    "Should expire in:",
                    verifyExpiry - Math.floor(Date.now() / 1000),
                    "seconds"
                  );
                }
              } catch (error) {
                console.error("Error setting cooldown:", error);
              }

              // Broadcast the update to all clients
              console.log("Broadcasting cube update to all clients");
              try {
                await context.realtime.send("cube_updates", cubeData);
                console.log("Update broadcast sent successfully");
              } catch (error) {
                console.error("Error broadcasting update:", error);
              }

              // Send confirmation to the client
              console.log("Sending cooldownStarted confirmation to client");
              webView.postMessage({
                type: "cooldownStarted",
                data: {
                  seconds: COOLDOWN_SECONDS,
                },
              });
              console.log("cooldownStarted confirmation sent");
              console.log(
                "======= COOLDOWN CHECK ENDED (PLACEMENT SUCCEEDED) ======="
              );
            } catch (error) {
              console.error("Unexpected error in cooldown check:", error);
              console.log("======= COOLDOWN CHECK ENDED (ERROR) =======");
            }
            break;
          }
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
