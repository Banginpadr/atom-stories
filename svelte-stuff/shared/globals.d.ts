import * as _atom from "atom";
import type { TextStory, TextStoryListItem } from "./types";

declare global {
  const tsatom: any;
  const flairMap: Record<string, string>;
  const apiBaseUrl: string;
  const story: TextStoryListItem;
  let accessToken: string;
  let refreshToken: string;
  const currentUserId: string;
  const initRecordingSteps: TextStory["recordingSteps"];
  const initialText: string;
}
