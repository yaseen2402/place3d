/** Message from Devvit to the web view. */
export type DevvitMessage =
  | {
      type: "initialData";
      data: {
        username: any;
        cubes: any;
        gameState: any;
      };
    }
  | {
      type: "updateCubes";
      data: {
        cubes: any;
      };
    }
  | {
      type: "cooldownActive";
      data: {
        remainingSeconds: number;
      };
    }
  | {
      type: "cooldownStarted";
      data: {
        seconds: number;
      };
    }
  | {
      type: "allowPlacement";
    };

/** Message from the web view to Devvit. */
export type WebViewMessage =
  | { type: "webViewReady" }
  | {
      type: "checkCooldown";
      data: any;
    };

/** Realtime channel message type */
export type RealtimeMessage = {
  type: "cube-placed";
  data: {
    cubeId: string;
  };
};

/**
 * Web view MessageEvent listener data type. The Devvit API wraps all messages
 * from Blocks to the web view.
 */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  /** Reserved type for messages sent via `context.ui.webView.postMessage`. */
  type?: "devvit-message" | string;
};
