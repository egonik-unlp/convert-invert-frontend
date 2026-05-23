export {};

declare global {
  interface Window {
    __syncDashBooted?: () => void;
  }
}
