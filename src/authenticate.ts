import polka from "polka";
import * as atom from "atom";
import { refreshTokenKey, accessTokenKey, apiBaseUrl } from "./constants";
import { Util } from "./util";

// https://github.com/shanalikhan/code-settings-sync/blob/master/src/service/github.oauth.service.ts
export const authenticate = () => {
  const app = polka();
  const server = app.listen(54321);
  atom.commands.executeCommand(
    "atom.open",
    atom.Uri.parse(`${apiBaseUrl}/auth/github`)
  );
  app.get("/callback/:token/:refreshToken", async (req, res) => {
    const { token, refreshToken } = req.params;
    if (!token || !refreshToken) {
      res.end(`ext: something went wrong`);
      (app as any).server.close();
      return;
    }

    await Util.context.globalState.update(accessTokenKey, token);
    await Util.context.globalState.update(refreshTokenKey, refreshToken);

    res.end(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src atom-resource:; form-action atom-resource:; frame-ancestors atom-resource:; img-src atom-resource: https:; script-src 'self' 'unsafe-inline' atom-resource:; style-src 'self' 'unsafe-inline' atom-resource:;"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      </head>
      <body>
          <h1>Success! You may now close this tab.</h1>
          <style>
            html, body {
              background-color: #1a1a1a;
              color: #c3c3c3;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
              width: 100%;
              margin: 0;
            }
          </style>
      </body>
    </html>
    `);

    (app as any).server.close();
  });
};
