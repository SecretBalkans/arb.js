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

  const raw_msg = JSON.stringify(
    {
      swap_tokens_for_exact:{
        expected_return: "767",
        path:[
          {
            addr: sScrt_stkdScrt_LP_address,
            code_hash: sScrt_stkdScrt_LP_hash
          }]
      }
    }
  )

  const swap = async () => {
    const tx = await arb.executeSecretContract(
      SCRT_address,
      {
        send: {
          "recipient": routerAddress,
          "recipient_code_hash": routerHash,
          "amount": "1000",
          "msg": toBase64(Buffer.from(raw_msg, 'ascii')),
          "padding": "u3a9nScQ"
        }
      },

    )
    console.log("Transaction output: ", tx)
  }

  await swap()
}

main().catch((e) => {
  console.log(e);
})
