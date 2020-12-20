import * as atom from "atom";
import { likeStory } from "./api";
import { authenticate } from "./authenticate";
import { mutation, mutationNoErr } from "./mutation";
import { RecordingStatus } from "./status";
import { StorySidebarProvider } from "./StorySidebarProvider";
import { Util } from "./util";
import { FlairProvider } from "./FlairProvider";
import { _prod_ } from "./constants";
import { PreviewStoryPanel } from "./PreviewStoryPanel";

export function activate(context: atom.ExtensionContext) {
  Util.context = context;
  FlairProvider.extensionUri = context.extensionUri;
  FlairProvider.init();

  atom.commands.registerCommand("stories.setFlair", () => {
    atom.window
      .showQuickPick(["vanilla js", ...Object.keys(FlairProvider.flairMap)])
      .then((flair) => {
        if (flair) {
          mutationNoErr("/update-flair", {
            flair,
          }).then(() => {
            atom.window.showInformationMessage(
              "Flair successfully set, it'll show up next time stories are loaded."
            );
          });
        }
      });
  });
  atom.commands.registerCommand("stories.authenticate", () => authenticate());

  const provider = new StorySidebarProvider(context.extensionUri);
  context.subscriptions.push(
    atom.window.registerWebviewViewProvider("storiesPanel", provider)
  );

  const provider2 = new StorySidebarProvider(context.extensionUri);
  context.subscriptions.push(
    atom.window.registerWebviewViewProvider("stories-full", provider2)
  );

  atom.commands.registerCommand("stories.refresh", () => {
    provider._view?.webview.postMessage({
      command: "refresh",
    });
    provider2._view?.webview.postMessage({
      command: "refresh",
    });
  });

  let isRecording = false;

  let filename = "untitled";
  let data: Array<[number, Array<atom.TextDocumentContentChangeEvent>]> = [];
  let startingText = "";
  let language = "";
  let startDate = new Date().getTime();
  let lastDelete = false;
  let lastMs = 0;
  const status = new RecordingStatus();

  const stop = async () => {
    status.stop();
    isRecording = false;
    PreviewStoryPanel.createOrShow(context.extensionUri, {
      initRecordingSteps: data,
      intialText: startingText,
    });
    const choice = await atom.window.showInformationMessage(
      `Your story is ready to go!`,
      "Publish",
      "Discard"
    );
    if (choice !== "Publish") {
      atom.commands.executeCommand("workbench.action.closeActiveEditor");
      return;
    }

    const story = await atom.window.withProgress(
      {
        location: atom.ProgressLocation.Notification,
        title: "Uploading...",
        cancellable: false,
      },
      () => {
        return mutationNoErr("/new-text-story", {
          filename,
          text: startingText,
          recordingSteps: data,
          programmingLanguageId: language,
        });
      }
    );
    if (story) {
      setTimeout(() => {
        atom.window.showInformationMessage("Story successfully created");
      }, 800);
      provider._view?.webview.postMessage({
        command: "new-story",
        story,
      });
      provider2._view?.webview.postMessage({
        command: "new-story",
        story,
      });
    }
  };

  atom.commands.registerCommand("stories.startTextRecording", async () => {
    if (!Util.isLoggedIn()) {
      const choice = await atom.window.showInformationMessage(
        `You need to login to GitHub to record a story, would you like to continue?`,
        "Yes",
        "Cancel"
      );
      if (choice === "Yes") {
        authenticate();
      }
      return;
    }

    if (!atom.window.activeTextEditor) {
      atom.window.showInformationMessage(
        "Open a file to start recording a story"
      );
      return;
    }
    try {
      await status.countDown();
    } catch (err) {
      atom.window.showWarningMessage("Recording cancelled");
      return;
    }
    status.start();
    filename = atom.window.activeTextEditor.document.fileName;
    startingText = atom.window.activeTextEditor.document.getText();
    language = atom.window.activeTextEditor.document.languageId;
    lastDelete = false;
    lastMs = 0;
    data = [[0, []]];
    isRecording = true;
    startDate = new Date().getTime();
    // setTimeout(() => {
    //   if (isRecording) {
    //     stop();
    //   }
    // }, 30000);
  });

  atom.commands.registerCommand("stories.stopTextRecording", () => stop());

  context.subscriptions.push(
    atom.workspace.onDidChangeTextDocument(
      (event) => {
        if (isRecording) {
          if (data.length > 100000) {
            isRecording = false;
            atom.window.showWarningMessage(
              "Recording automatically stopped, the recording data is getting really big."
            );
            stop();
            return;
          }
          const ms = new Date().getTime() - startDate;
          if (ms - 10 > lastMs) {
            data.push([ms, []]);
          }
          for (const change of event.contentChanges) {
            if (change.text === "") {
              if (lastDelete) {
                data[data.length - 1][1].push(change);
                continue;
              }
              data.push([ms, [change]]);
              lastDelete = true;
            } else {
              data[data.length - 1][1].push(change);
            }
          }
          lastMs = ms;
        }
      },
      null,
      context.subscriptions
    )
  );
}
