import { RecordingOptions as RecOp } from "@arcsine/screen-recorder";
import { TextDocumentContentChangeEvent } from "atom";

// https://github.com/arciisine/atom-chronicler/blob/master/src/types.ts
export interface RecordingOptions extends RecOp {
  countdown: number;
  animatedGif: boolean;
  gifScale: number;
}

export type RecordingSteps = Array<[number, Array<TextDocumentContentChangeEvent>]>