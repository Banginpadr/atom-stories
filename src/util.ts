import * as path from "path";
import * as atom from "atom";
import { refreshTokenKey, accessTokenKey } from "./constants";

// https://github.com/arciisine/atom-chronicler/blob/master/src/util.ts
export class Util {
  static context: atom.ExtensionContext;

  static getRefreshToken() {
    return this.context.globalState.get<string>(refreshTokenKey) || "";
  }

  static getAccessToken() {
    return this.context.globalState.get<string>(accessTokenKey) || "";
  }

  static isLoggedIn() {
    return (
      !!this.context.globalState.get(accessTokenKey) &&
      !!this.context.globalState.get(refreshTokenKey)
    );
  }

  static getWorkspacePath() {
    const folders = atom.workspace.workspaceFolders;
    return folders ? folders![0].uri.fsPath : undefined;
  }

  static getResource(rel: string) {
    return path
      .resolve(this.context.extensionPath, rel.replace(/\//g, path.sep))
      .replace(/\\/g, "/");
  }
}
