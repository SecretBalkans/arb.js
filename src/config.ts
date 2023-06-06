import path from "path";

export default {
  maxProcessCount: process.env.MAX_PROCESS_COUNT ? +process.env.MAX_PROCESS_COUNT : 2,
  secrets: require(path.join(__dirname,'../.secrets')) as {
    cosmos: { privateHex: string, mnemonic: string},
    secret: { apiKey: string},
    monitor: {
        gqlUrl: any;
        gqlPassword: string
    }
  }
};
