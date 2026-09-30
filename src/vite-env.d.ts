/// <reference types="vite/client" />

// Use Mammoth's browser build consistently in the app and import tests.
declare module "mammoth/mammoth.browser" {
  import mammoth from "mammoth";
  export default mammoth;
}
