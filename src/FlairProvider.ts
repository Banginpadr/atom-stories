import * as fs from "fs";
import * as atom from "atom";
import btoa from "btoa";

export class FlairProvider {
  static extensionUri: atom.Uri;
  static flairMap: Record<string, string> = {};
  static flairUriMap: Record<string, atom.Uri> = {};
  static javascriptMapString = "";
  static init() {
    const flairPath = atom.Uri.joinPath(this.extensionUri, "media", "flairs");
    const files = fs.readdirSync(flairPath.fsPath);
    files.forEach((f) => {
      const uri = atom.Uri.joinPath(this.extensionUri, "media", "flairs", f);
      const content = fs.readFileSync(uri.fsPath, { encoding: "utf-8" });
      const flairName = f.split(".")[0];
      this.flairMap[flairName] = "data:image/svg+xml;base64," + btoa(content);
      this.flairUriMap[flairName] = uri;
    });
  }

  static getJavascriptMapString() {
    if (!this.javascriptMapString) {
      return `
      const flairMap = {
        ${Object.entries(this.flairMap).map(([k, v]) => `"${k}": "${v}"`)}
      }
      `;
    }

    return this.javascriptMapString;
  }
}
