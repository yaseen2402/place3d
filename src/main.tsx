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

    const postId = context.postId;

    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? "anon";
    });

    const [leaderboard, setLeaderboard] = useState(async () => {
      return await context.redis.zRange(`leaderboard_${postId}`, 0, 5, {
        reverse: true, // Get highest scores first
        by: "rank",
      });
    });
    const CUBES_HASH_KEY = `game_cubes_${postId}`;
    const mySession = sessionId();

    const { data: cubes, loading: cubesLoading } = useAsync(
      async () => (await context.redis.hGetAll(CUBES_HASH_KEY)) ?? []
    );

    const channel = useChannel({
      name: "cube_updates",
      onMessage: (cubeData: any) => {
        // Update the web view with the new cube data
        // if (cubeData.session === mySession || cubeData.postId !== postId) {
        //   //Ignore my updates b/c they have already been rendered
        //   return;
        // }
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
            const checkCooldownKey = `user_${username}_cooldown`;

            // Check if the key exists in Redis
            try {
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

                  const currentTime = Math.floor(Date.now() / 1000);

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

              // No cooldown active, proceed with cube placement
              const cubeData = message.data;
              const cubeId = `${cubeData.x}_${cubeData.y}_${cubeData.z}`;
              console.log("Generated cube ID:", cubeId);

              console.log("Saving cube data to Redis");
              try {
                await context.redis.hSet(CUBES_HASH_KEY, {
                  [cubeId]: JSON.stringify(cubeData),
                });

                await context.redis.zIncrBy(
                  `leaderboard_${postId}`,
                  username,
                  1
                );

                console.log("Cube data saved successfully");
              } catch (error) {
                console.error("Error saving cube data:", error);
              }

              // Set cooldown
              try {
                await context.redis.set(checkCooldownKey, "1");

                await context.redis.expire(checkCooldownKey, COOLDOWN_SECONDS);
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
      <vstack grow padding="small" backgroundColor="#ff4500">
        <vstack grow alignment="middle center">
          <vstack alignment="start middle"></vstack>
          <image url="place3d_logo.png" imageWidth={200} imageHeight={200} />

          {/* Optional spacer between image and button */}
          <spacer size="small" />
          <button
            onPress={() => webView.mount()}
            appearance="primary"
            size="large"
            icon="play"
          >
            Play
          </button>
          <spacer size="medium" />

          {/* Enhanced Leaderboard Section */}
          <vstack
            padding="medium"
            width="100%"
            backgroundColor="#f6f7f8"
            cornerRadius="small"
          >
            <hstack alignment="center middle" gap="small">
              <text
                size="xlarge"
                weight="bold"
                alignment="center"
                color="black"
              >
                Leaderboard
              </text>
            </hstack>

            <spacer size="small" />

            {leaderboard && (leaderboard as any).length > 0 ? (
              <hstack gap="small" width="100%">
                {/* Left column - first 3 players */}
                <vstack width="50%" gap="small">
                  {(leaderboard as any)
                    .slice(0, 3)
                    .map((entry: any, index: any) => (
                      <hstack
                        key={index}
                        gap="medium"
                        padding="small"
                        width="100%"
                        backgroundColor={index === 0 ? "#FFF9C4" : "white"}
                        cornerRadius="small"
                      >
                        <text
                          size="medium"
                          weight={index < 3 ? "bold" : "regular"}
                          color={
                            index === 0
                              ? "black"
                              : index === 1
                              ? "#757575"
                              : index === 2
                              ? "#A52714"
                              : "black"
                          }
                        >
                          {index + 1}.
                        </text>
                        <text size="medium" weight="bold" color="black">
                          {entry.member}
                        </text>
                        <spacer grow />
                        <text
                          size="medium"
                          weight="bold"
                          color={index < 3 ? "#FF4500" : "black"}
                        >
                          {entry.score}
                        </text>
                      </hstack>
                    ))}
                </vstack>

                {/* Right column - next 3 players */}
                <vstack width="50%" gap="small">
                  {(leaderboard as any)
                    .slice(3, 6)
                    .map((entry: any, index: any) => (
                      <hstack
                        key={index + 3}
                        gap="medium"
                        padding="small"
                        width="100%"
                        backgroundColor="white"
                        cornerRadius="small"
                      >
                        <text size="medium" weight="regular" color="black">
                          {index + 4}.
                        </text>
                        <text size="medium" weight="bold" color="black">
                          {entry.member}
                        </text>
                        <spacer grow />
                        <text size="medium" weight="bold" color="black">
                          {entry.score}
                        </text>
                      </hstack>
                    ))}
                </vstack>
              </hstack>
            ) : (
              <vstack padding="large" alignment="center middle">
                <icon name="info" color="#757575" />
                <spacer size="small" />
                <text size="medium" alignment="center" color="#757575">
                  No scores yet. Be the first to play!
                </text>
              </vstack>
            )}
          </vstack>

          <spacer />
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;
