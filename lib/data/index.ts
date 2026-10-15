import { api } from "@/lib/api-client";
import { mock } from "./mock";

/** Everything the UI reads or writes. `api` talks to the backend; `mock` is the mockup's sample data. */
export type DataSource = Pick<
  typeof api,
  | "getMe"
  | "logout"
  | "updateMe"
  | "getConfig"
  | "getLibrary"
  | "getCollectionsStatus"
  | "getCollection"
  | "requestDownload"
  | "getQueue"
  | "getJudging"
  | "acceptCandidate"
  | "search"
  | "getJudgements"
  | "getPipeline"
  | "setDownloadsPaused"
  | "resolveResource"
  | "previewExtension"
  | "getDownloads"
  | "fileDownloadUrl"
  | "folderZipUrl"
  | "fillFolder"
  | "trackFileUrl"
  | "getDownloadedSongs"
  | "getDownloadedCollections"
  | "fillDownloadedFolder"
  | "listUsers"
  | "inviteUser"
  | "updateUser"
  | "getWorkers"
  | "startWorkers"
  | "stopWorkers"
  | "getActiveDownloads"
  | "cancelDownload"
  | "getLogs"
  | "setJudge"
  | "resetJudge"
>;

/** `?mock` in the address (or VITE_MOCK=1 at build time) runs the UI on sample data, no backend. */
export const isMock = (() => {
  if (import.meta.env.VITE_MOCK === "1") return true;
  try {
    return new URLSearchParams(window.location.search).has("mock");
  } catch {
    return false;
  }
})();

export const data: DataSource = isMock ? mock : api;
