import { runtime } from "./runtime";
export const ENV = {
    get appId() { return runtime().APP_ID || "rebiomed-cloudflare"; },
    get ownerOpenId() { return ""; },
};
