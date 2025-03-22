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



// Add this constant at the top with other constants
const COOLDOWN_SECONDS = 20;


// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "place3d",
  height: "tall",
  render: (context) => {
    // Load username with `useAsync` hook

    const postId = context.postId;
    const CUBES_HASH_KEY = `game_cubes_${postId}`;
    
    
    const [username, setUsername] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? "anon";
    });
    
    // const [cubes, setCubes] = useState(async () => {
    //   return (await context.redis.hGetAll(CUBES_HASH_KEY)) ?? [];
    // });
    
    // const [gameState, setGameState] = useState(async () => {
    //   return (await context.redis.get(`game_state_${postId}`)) ?? "not_defined";
    // });

    

    

    const [leaderboard, setLeaderboard] = useState(async () => {
      return await context.redis.zRange(`leaderboard_${postId}`, 0, 5, {
        reverse: true, // Get highest scores first
        by: "rank",
      });
    });

    

    const channel = useChannel({
      name: "cube_updates",
      onMessage: (cubeData: any) => {
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
            console.log("webViewReady message received");
            const cubes = await context.redis.hGetAll(CUBES_HASH_KEY) ?? [];
            const gameState =await context.redis.get(`game_state_${postId}`) ?? "not_defined";
              
            console.log("initialData message sent");
              webView.postMessage({
                type: "initialData",
                data: {
                  username: username ,
                  cubes: cubes,
                  gameState: gameState,
                },
              });
            break;
          case "checkCooldown": {
            const checkCooldownKey = `user_${username}_cooldown`;

            // Check if the key exists in Redis
            try {
              const cooldownExists = await context.redis.exists(
                checkCooldownKey
              );

              if (cooldownExists) {
                console.log("Cooldown key exists, getting expiry timestamp");
                try {
                  const expiryTimestamp = await context.redis.expireTime(
                    checkCooldownKey
                  );


                  const remainingSeconds = expiryTimestamp;


                  if (remainingSeconds > 0) {
                    console.log(
                      "Cooldown is active, sending cooldownActive message"
                    );
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
                  username ?? "anon",
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
      <vstack grow padding="small" backgroundColor="rgba(255, 69, 0, 0.7)">
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


Devvit.addSchedulerJob({
  name: 'daily_game_post',
  onRun: async (_, context) => {
    console.log('Creating new daily game post');
    const subreddit = await context.reddit.getCurrentSubreddit();
    
    // Create the new game post
    const post = await context.reddit.submitPost({
      title: `Daily Game - ${new Date().toLocaleDateString()}`,
      subredditName: subreddit.name,
      preview: (
        <vstack>
          <text>Loading...</text>
        </vstack>
      ),
    });
    
    
    await context.redis.set(`game_state_${post.id}`, 'active');
    
    // Schedule the end of the game (24 hours later)
    const endGameJobId = await context.scheduler.runJob({
      name: 'end_game',
      data: { postId: post.id },
      // runAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      runAt: new Date(Date.now() + 4 * 60 * 1000), // 24 hours from now
    });
    
    // Store the end game job ID
    await context.redis.set(`end_game_job:${post.id}`, endGameJobId);
  },
});

// Define a job to end the game
Devvit.addSchedulerJob({
  name: 'end_game',
  onRun: async (event, context) => {
    const { postId } = event.data as { postId: string };
    
    // Update the game state to "ended"
    await context.redis.set(`game_state_${postId}`, 'ended');
    
    // Update the post to indicate the game has ended
    const post = await context.reddit.getPostById(postId);
    // await post.edit({
    //   text: post.title + '\n\n**GAME ENDED**: This game has concluded and no more entries are being accepted.',
    // });
    
    console.log(`Game ended for post ${postId}`);
  },
});


Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    try {
      // Schedule the job to run daily at 12:00 UTC
      const jobId = await context.scheduler.runJob({
        // cron: '0 12 * * *', // Run at 12:00 UTC every day
        cron: '35 22 * * *', // Run at 12:00 UTC every day
        name: 'daily_game_post',
        data: {},
      });
      // Store the job ID for future reference
      await context.redis.set('dailyGameJobId', jobId);
    } catch (e) {
      console.log('Error scheduling daily game post:', e);
      throw e;
    }
  },
});


export default Devvit;
