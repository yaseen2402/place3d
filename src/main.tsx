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

    const [leaderboard, setLeaderboard] = useState(async () => {
      return await context.redis.zRange(`leaderboard_${postId}`, 0, 5, {
        reverse: true, // Get highest scores first
        by: "rank",
      });
    });

    const channel = useChannel({
      name: "cube_updates",
      onMessage: (cubeData: any) => {
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
            const cubes = (await context.redis.hGetAll(CUBES_HASH_KEY)) ?? [];
            const gameState =
              (await context.redis.get(`game_state_${postId}`)) ??
              "not_defined";

            webView.postMessage({
              type: "initialData",
              data: {
                username: username,
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
                try {
                  const expiryTimestamp = await context.redis.expireTime(
                    checkCooldownKey
                  );

                  const remainingSeconds = expiryTimestamp;

                  if (remainingSeconds > 0) {
                    webView.postMessage({
                      type: "cooldownActive",
                      data: {
                        remainingSeconds: remainingSeconds,
                      },
                    });

                    return;
                  } else {
                    console.log(
                      "Cooldown exists but is expired (remainingSeconds <= 0)"
                    );
                  }
                } catch (error) {
                  console.error("Error getting expiry time:", error);
                }
              }
              //  else {
              //   console.log("No cooldown found for this user");
              // }

              // No cooldown active, proceed with cube placement
              const cubeData = message.data;
              const cubeId = `${cubeData.x}_${cubeData.y}_${cubeData.z}`;

              try {
                await context.redis.hSet(CUBES_HASH_KEY, {
                  [cubeId]: JSON.stringify(cubeData),
                });

                await context.redis.zIncrBy(
                  `leaderboard_${postId}`,
                  username ?? "anon",
                  1
                );
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
              try {
                await context.realtime.send("cube_updates", cubeData);
              } catch (error) {
                console.error("Error broadcasting update:", error);
              }

              // Send confirmation to the client
              webView.postMessage({
                type: "cooldownStarted",
                data: {
                  seconds: COOLDOWN_SECONDS,
                },
              });
            } catch (error) {
              console.error("Unexpected error in cooldown check:", error);
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
      <vstack grow padding="small" backgroundColor="rgb(255, 89, 0)">
        <vstack grow alignment="middle center">
          {/* <vstack alignment="start middle"></vstack> */}
          <image url="place3d.png" imageWidth={400} imageHeight={230} />
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
            backgroundColor="rgba(68, 88, 146, 0.3)"
            cornerRadius="small"
          >
            <hstack alignment="center middle" gap="small">
              {/* <zstack backgroundColor="rgba(68, 88, 146, 0.3)" padding="small" cornerRadius="small" > */}

              <text
                size="xlarge"
                weight="bold"
                alignment="center"
                color="white"
                outline="thick"
              >
                Leaderboard
              </text>
              {/* </zstack> */}
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
                        backgroundColor="rgba(255, 255, 255, 0.1)"
                        // backgroundColor="rgba(114, 88, 255, 0.8)"
                        cornerRadius="small"
                      >
                        <text
                          size="medium"
                          weight={index < 3 ? "bold" : "regular"}
                          color="white"
                          outline="thick"
                        >
                          {index + 1}.
                        </text>
                        <text
                          size="medium"
                          weight="bold"
                          color="white"
                          outline="thick"
                        >
                          {entry.member}
                        </text>
                        <spacer grow />
                        <text
                          size="medium"
                          weight="bold"
                          color="white"
                          outline="thick"
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
                        backgroundColor="rgba(255, 255, 255, 0.1)"
                        cornerRadius="small"
                      >
                        <text
                          size="medium"
                          weight="bold"
                          color="white"
                          outline="thick"
                        >
                          {index + 4}.
                        </text>
                        <text
                          size="medium"
                          weight="bold"
                          color="white"
                          outline="thick"
                        >
                          {entry.member}
                        </text>
                        <spacer grow />
                        <text
                          size="medium"
                          weight="bold"
                          color="white"
                          outline="thick"
                        >
                          {entry.score}
                        </text>
                      </hstack>
                    ))}
                </vstack>
              </hstack>
            ) : (
              <vstack padding="large" alignment="center middle">
                <icon name="info" color="white" />
                <spacer size="small" />
                <text
                  size="medium"
                  alignment="center"
                  color="white"
                  outline="thin"
                >
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
  name: "daily_game_post",
  onRun: async (_, context) => {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const gameTitles = [
      "Underwater Atlantis",
      "Desert Oasis",
      "Volcanic Crater",
      "Heaven vs Hell",
      "Lost Civilization",
      "Alien World",
      "International Space Station",
      "Moon Colony",
      "Sky Castle",
      "Ancient Ruins",
      "Futuristic City",
      "Dystopian Wasteland",
      "Mecha Battle Arena",
      "Robot Factory",
      "Asteroid Mining Colony",
      "Ancient Rome",
      "Egyptian Pyramids",
      "Medieval Kingdom",
      "Great Wall of China",
      "Taj Mahal",
      "Burj Khalifa",
      "Empire State Building",
      "Great Sphinx of Giza",
      "Pyramids of Giza",
      "Stonehenge",
      "Tower of Pisa",
      "Tower of London",
      "Titanic Shipwreck",
      "Sunken Ship Graveyard",
      "Fire & Ice Dual-World",
      "Upside-Down",
      "Giant Chessboard Battlefield",
      "Meme World",
      "One-Color Only Mode",
      "Spaceships",
      "Roman Colosseum",
      "Petra",
      "Grand Canyon",
      "Statue of Liberty",
      "Golden Gate Bridge",
      "Niagara Falls",
      "Santorini",
      "Mount Fuji",
      "Buckingham Palace",
      "Tower of Pisa",
      "Dubai Frame",
      "Chichen Itza",
      "Times Square",
      "Shibuya Crossing",
      "Moscow’s Red Square",
      "Palm Jumeirah",
      "International Space Station",
      "Mount Everest",
      "Great Barrier Reef",
      "Tokyo Tower",
      "Burj Al Arab",
      "Disneyland & Disney World",
      "AI World",
      "The Merlion park loin / mermaid",
      "Anime World",
      "Death Star (Star Wars)",
      "Hogwarts Castle",
      "Iron Man",
      "Thanos’ Infinity Gauntlet",
      "Jurassic Park",
      "Yggdrasil",
    ];

    // Randomly select a title from the array
    const randomTitle =
      gameTitles[Math.floor(Math.random() * gameTitles.length)];

    // const pinnedPosts = await context.reddit.getPinnedPosts({
    //   subredditName: subreddit.name,
    // });
    // Create the new game post
    const post = await context.reddit.submitPost({
      // title: `Build: Yggdrasil`,
      title: `Build: ${randomTitle}`,
      subredditName: subreddit.name,
      preview: (
        <vstack
          backgroundColor="rgb(255, 89, 0)"
          alignment="center middle"
          height="100%"
          width="100%"
        >
          <text size="medium" alignment="center" color="white" outline="thin">
            Loading...
          </text>
        </vstack>
      ),
    });

    await context.redis.set(`game_state_${post.id}`, "active");

    // Schedule the end of the game (24 hours later)
    const endGameJobId = await context.scheduler.runJob({
      name: "end_game",
      data: { postId: post.id },
      runAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });

    // Store the end game job ID
    await context.redis.set(`end_game_job:${post.id}`, endGameJobId);
  },
});

// Define a job to end the game
Devvit.addSchedulerJob({
  name: "end_game",
  onRun: async (event, context) => {
    const { postId } = event.data as { postId: string };

    // Update the game state to "ended"
    await context.redis.set(`game_state_${postId}`, "ended");

    // Update the post to indicate the game has ended
    const post = await context.reddit.getPostById(postId);

  },
});

Devvit.addTrigger({
  events: ["AppInstall", "AppUpgrade"],
  onEvent: async (_, context) => {
    try {
      // Schedule the job to run daily at 12:00 UTC
      const existingJobs = await context.scheduler.listJobs();
      if (existingJobs && existingJobs.length) {
        for (const job of existingJobs) {
          await context.scheduler.cancelJob(job.id);
        }
        console.log(`${existingJobs.length} existing jobs cancelled`);
      } else {
        console.log(`No existing jobs`);
      }

      const jobId = await context.scheduler.runJob({
        cron: "30 17 * * *",
        name: "daily_game_post",
        data: {},
      });
      // Store the job ID for future reference
      await context.redis.set("dailyGameJobId", jobId);

      const jobs = await context.scheduler.listJobs();
    } catch (e) {
      console.log("Error scheduling daily game post:", e);
      throw e;
    }
  },
});

export default Devvit;
