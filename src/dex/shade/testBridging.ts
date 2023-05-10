import { toBase64 } from "secretjsbeta"
import { ArbWallet } from "../../wallet/ArbWallet"
import config from "../../config"

import { AxelarAssetTransfer, Environment, AxelarQueryAPI, CHAINS } from "@axelar-network/axelarjs-sdk";

async function main(){
   bridge()
}

async function bridge() {
    const secretChainUrl = "https://lcd.spartanapi.dev"
    
    const axlUSDC_address = "secret1vkq022x4q8t8kx9de3r84u669l65xnwf2lg3e6"
    const SCRT_address = "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek"
    const SCRT_hash = "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e"

    const ibc_contract_address = "secret1yxjmepvyl2c25vnt53cr2dpn8amknwausxee83"
    const ibc_contract_hash = "2976a2577999168b89021ecb2e09c121737696f71c4342f9a922ce8654e98662"
    const receiver_account = "osmo1uqyurl9u4cc8l08v558jpzwc0ry955k8ys9s9s"
    
    const axelarAssetTransfer = new AxelarAssetTransfer({
        environment: Environment.MAINNET,
    });
    
    const axelarQuery = new AxelarQueryAPI({
        environment: Environment.MAINNET,
    });
    
    const token_denom = await axelarQuery.getDenomFromSymbol("axlUSDC", "secret-snip");
    console.log("Denomination: ", token_denom)
    const token_amount = 1000

    const fee = await axelarQuery.getTransferFee(
        "secret-snip",
        CHAINS.MAINNET.OSMOSIS,
        token_denom,
        token_amount
    );

    console.log("Fee: ", fee)
    if(!fee) return

    const amountIn = (token_amount + Number(fee.fee.amount)).toString()

    const depositAddress = await axelarAssetTransfer.getDepositAddress({
        fromChain: "secret-snip",
        toChain: CHAINS.MAINNET.OSMOSIS,
        destinationAddress: receiver_account,
        asset: token_denom,
    });
    
    console.log("After getDepositAddress: ", depositAddress)
    
    let arb = new ArbWallet({
        secretLcdUrl: secretChainUrl,
        mnemonic: config.secrets.cosmos.mnemonic,
        privateHex: "",
        secretNetworkViewingKey: "",
    });

    const raw_msg = JSON.stringify({channel:"channel-61", remote_address:depositAddress, timeout:600})
    const bridge_call = async () => {
        const tx = await arb.executeSecretContract(
            axlUSDC_address,
            {
                send: {
                    recipient: ibc_contract_address,
                    recipient_code_hash: ibc_contract_hash,
                    amount: amountIn,
                    msg: toBase64(Buffer.from(raw_msg, 'ascii')),
                }
            },
            
        )
        console.log("Transaction output: ", tx)
    }

    // await bridge_call()
}


main().catch((e) => {
    console.log(e)
})
