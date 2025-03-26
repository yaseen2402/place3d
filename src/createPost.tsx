import { Devvit } from "@devvit/public-api";

// Adds a new menu item to the subreddit allowing to create a new post
Devvit.addMenuItem({
  label: "Create New 3d Post",
  location: "subreddit",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: "Create your imagination",
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack
          backgroundColor="rgb(255, 89, 0)"
          height="100%"
          width="100%"
          alignment="middle center"
        >
          <text size="large" alignment="center" color="white" outline="thick">
            Loading ...
          </text>
        </vstack>
      ),
    });
    ui.showToast({ text: "Created post!" });
    ui.navigateTo(post);
  },
});
