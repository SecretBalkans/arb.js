import { toBase64 } from "@cosmjs/encoding";
import config from "../../config";
import { ArbWallet } from "../../wallet/ArbWallet";
import { SecretContractAddress } from './types';

async function main(){
   liquidate()
}

async function liquidate() {
    const secretChainUrl = "https://lcd.spartanapi.dev"

    const vault_registry_address = "secret1qxk2scacpgj2mmm0af60674afl9e6qneg7yuny"

    const stkd_secret_address = "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4" //when depositing calling this contract with the message (snip20 thing)

    let arb = new ArbWallet({
        secretLcdUrl: secretChainUrl,
        mnemonic: config.secrets.cosmos.mnemonic,
        privateHex: "",
        secretNetworkViewingKey: "",
    });

    const vaults = await arb.querySecretContract(
        vault_registry_address as SecretContractAddress,
        {
            vaults: {
                starting_page: "1"
            }
        }
    )

    console.log("Transaction result: ", vaults)

    const liquidatablePositions = await arb.querySecretContract(
        vault_registry_address as SecretContractAddress,
        {
            liquidatable_positions: {
                vault_id: "1"
            }
        }
    )

    console.log("Liquidatable positions for the 1st vault: ", liquidatablePositions)

    //execute the liquidation

    const borrow = await arb.executeSecretContract(
        vault_registry_address,
        {
            vault_action: {
                vault_id: "1",
                msg: {
                    borrow: {
                        "amount": "1000",
                        "max_fee": "100000000000000"
                    }
                }
            }
        }
    )

    console.log("Borrow result: ", borrow)

    // const liquidate_call = await arb.executeSecretContract(
    //     vault_registry_address,
    //     {
    //         vault_action: {
    //             vault_id: "1",
    //             msg: {
    //                 liquidate: {
    //                     position_id: "1",
    //                     max_fee: "100000000000000"
    //                 }
    //             }
    //         }
            
    //     }
    // )

    // console.log("")

    
}


main().catch((e) => {
    console.log(e)
})
