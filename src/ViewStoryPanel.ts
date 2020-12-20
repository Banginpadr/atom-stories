import * as atom from "atom";
import { accessTokenKey, apiBaseUrl, refreshTokenKey } from "./constants";
import { FlairProvider } from "./FlairProvider";
import { getNonce } from "./getNonce";
import { Util } from "./util";
import jwt from "jsonwebtoken";

export class ViewStoryPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: ViewStoryPanel | undefined;

  public static readonly viewType = "viewStory";

  private readonly _panel: atom.WebviewPanel;
  private readonly _extensionUri: atom.Uri;
  private _story: any;
  private _disposables: atom.Disposable[] = [];

  public static createOrShow(extensionUri: atom.Uri, story: any) {
    const column = atom.window.activeTextEditor
      ? atom.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (ViewStoryPanel.currentPanel) {
      ViewStoryPanel.currentPanel._panel.reveal(column);
      ViewStoryPanel.currentPanel._story = story;
      ViewStoryPanel.currentPanel._update();
      return;
    }

    // Otherwise, create a new panel.
    const panel = atom.window.createWebviewPanel(
      ViewStoryPanel.viewType,
      "View Story",
      column || atom.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,

        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
          atom.Uri.joinPath(extensionUri, "media"),
          atom.Uri.joinPath(extensionUri, "out/compiled"),
        ],
      }
    );

    ViewStoryPanel.currentPanel = new ViewStoryPanel(
      panel,
      extensionUri,
      story
    );
  }

  public static revive(
    panel: atom.WebviewPanel,
    extensionUri: atom.Uri,
    story: any
  ) {
    ViewStoryPanel.currentPanel = new ViewStoryPanel(
      panel,
      extensionUri,
      story
    );
  }

  private constructor(
    panel: atom.WebviewPanel,
    extensionUri: atom.Uri,
    story: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._story = story;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // // Handle messages from the webview
    // this._panel.webview.onDidReceiveMessage(
    //   (message) => {
    //     switch (message.command) {
    //       case "alert":
    //         atom.window.showErrorMessage(message.text);
    //         return;
    //     }
    //   },
    //   null,
    //   this._disposables
    // );
  }

  public dispose() {
    ViewStoryPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _update() {
    const webview = this._panel.webview;

    this._panel.webview.html = this._getHtmlForWebview(webview);
    webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "close": {
          atom.commands.executeCommand("workbench.action.closeActiveEditor");
          break;
        }
        case "onInfo": {
          if (!data.value) {
            return;
          }
          atom.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          atom.window.showErrorMessage(data.value);
          break;
        }
        case "tokens": {
          await Util.context.globalState.update(
            accessTokenKey,
            data.accessToken
          );
          await Util.context.globalState.update(
            refreshTokenKey,
            data.refreshToken
          );
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: atom.Webview) {
    // // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(
      atom.Uri.joinPath(this._extensionUri, "out", "compiled/view-story.js")
    );

    // Local path to css styles
    const styleResetPath = atom.Uri.joinPath(
      this._extensionUri,
      "media",
      "reset.css"
    );
    const stylesPathMainPath = atom.Uri.joinPath(
      this._extensionUri,
      "media",
      "atom.css"
    );

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
    const cssUri = webview.asWebviewUri(
      atom.Uri.joinPath(this._extensionUri, "out", "compiled/view-story.css")
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();
    const story = this._story;

    this._panel.title = story.creatorUsername;

    if (story.flair in FlairProvider.flairUriMap) {
      const both = FlairProvider.flairUriMap[story.flair];
      this._panel.iconPath = {
        light: both,
        dark: both,
      };
    } else {
      this._panel.iconPath = undefined;
    }

    let currentUserId = "";
    try {
      const payload: any = jwt.decode(Util.getAccessToken());
      currentUserId = payload.userId;
    } catch {}

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src ${apiBaseUrl}; img-src https: data:; style-src ${
      webview.cspSource
    }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">
        <link href="${cssUri}" rel="stylesheet">
        <script nonce="${nonce}">
            const currentUserId = "${currentUserId}";
            const story = JSON.parse('${JSON.stringify(this._story)}');
            let accessToken = "${Util.getAccessToken()}";
            let refreshToken = "${Util.getRefreshToken()}";
            const apiBaseUrl = "${apiBaseUrl}";
            const tsatom = acquireVsCodeApi();
            ${FlairProvider.getJavascriptMapString()}
        </script>
			</head>
      <body>
			</body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</html>`;
  }
}
