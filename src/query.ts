import fetch from "node-fetch";
import * as atom from "atom";
import { apiBaseUrl } from "./constants";

export const queryNoErr = async (path: string) => {
  try {
    const d = query(path);
    return d;
  } catch {}
};

export const query = async (path: string) => {
  try {
    const r = await fetch(apiBaseUrl + path);
    if (r.status !== 200) {
      throw new Error(await r.text());
    }
    const d = await r.json();
    return d;
  } catch (err) {
    console.log(err);
    atom.window.showErrorMessage(err.message);
    throw err;
  }
};
