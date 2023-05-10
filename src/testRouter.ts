import { SecretNetworkClient } from 'secretjsbeta';
import { toBase64 } from "secretjsbeta"
// import { privateMnemonic } from "../../../.secrets"
import { ArbWallet } from "./wallet/ArbWallet"
import config from "./config"


async function main(){

  // Secret.js Client
  let secretjs: SecretNetworkClient

  let arb = new ArbWallet({
    secretLcdUrl: 'https://lcd.spartanapi.dev',
    mnemonic: config.secrets.cosmos.mnemonic,//privateMnemonic,
    privateHex: "",
    secretNetworkViewingKey: "",
  });
  // Get environment variables from .env
  const secretChainUrl = "https://lcd.spartanapi.dev"//"https://rpc.pulsar.scrttestnet.com/"
  const routerCode = ""
  const routerHash = "448e3f6d801e453e838b7a5fbaa4dd93b84d0f1011245f0d5745366dadaf3e85"
  const routerAddress = "secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc"

  const SCRT_address = "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek"
  const SCRT_hash = "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e"

  const sScrt_stkdScrt_LP_address = "secret1y6w45fwg9ln9pxd6qys8ltjlntu9xa4f2de7sp"
  const sScrt_stkdScrt_LP_hash = "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"
  const amount = "4830000";
  const expectedReturn = "50000000";

  const apContractPath = [
    {
      "address": "secret1a65a9xgqrlsgdszqjtxhz069pgsh8h4a83hwt0",
      "codeHash": "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"
    },
    {
      "address": "secret1y5ay9sw43rqydyyds6tuam0ugt4rxxu3cmpc79",
      "codeHash": "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"
    },
    {
      "address": "secret1jas8rrntj4u77qu4vt5wk8y05vtcz40acp3kh9",
      "codeHash": "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"
    },
    {
      "address": "secret1qz57pea4k3ndmjpy6tdjcuq4tzrvjn0aphca0k",
      "codeHash": "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"
    }
  ];
  const raw_msg = JSON.stringify(
    {
      swap_tokens_for_exact:{
        expected_return: expectedReturn,
        path: apContractPath.map(d => ({addr: d.address, code_hash: d.codeHash}))
      }
    }
  )
  const sOSMO = 'secret150jec8mc2hzyyqak4umv6cfevelr0x9p0mjxgg';
  const sATOM = 'secret14mzwd0ps5q277l20ly2q3aetqe3ev4m4260gf4';
  const tokenAddress = sATOM;
  const swap = async () => {
    const tx = await arb.executeSecretContract(
      tokenAddress,
      {
        send: {
          "recipient": routerAddress,
          "recipient_code_hash": routerHash,
          "amount": amount,
          "msg": toBase64(Buffer.from(raw_msg, 'ascii')),
          "padding": "u3a9nScQ"
        }
      },
      0.015,
      3300000, // TODO: see shade UI gas fee calculation based on hops
    )
    console.log("Transaction output: ", tx)
  }

  await swap()
}

main().catch((e) => {
  console.log(e);
})
