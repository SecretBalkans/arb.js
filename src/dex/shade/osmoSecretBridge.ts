import { Secp256k1HdWallet, StdFee } from "@cosmjs/launchpad";
import config from "../../config"

import { AxelarAssetTransfer, Environment, AxelarQueryAPI, CHAINS } from "@axelar-network/axelarjs-sdk";
import { chains } from 'chain-registry';
import { getOfflineSignerAmino as getOfflineSigner } from 'cosmjs-utils';
import { cosmos, getSigningOsmosisClient, ibc } from "osmojs";
import { MsgTransfer } from "osmojs/types/codegen/ibc/applications/transfer/v1/tx";
import { MsgSend } from "osmojs/types/codegen/cosmos/bank/v1beta1/tx";
import { SigningStargateClient, SigningStargateClientOptions } from "@cosmjs/stargate"
import { DirectSecp256k1HdWallet, coin, coins } from "@cosmjs/proto-signing";
import Long from "long";


async function main(){
   bridge()
}

async function bridge() {
    const osmoChainRPC = "https://rpc.osmosis.zone"
    
    const axlUSDC_address = "" //I guess there is no address, cause it's a native token

    const sender_account = "osmo1uqyurl9u4cc8l08v558jpzwc0ry955k8ys9s9s"
    const receiver_account = "secret1rqlnhamgtxw24rz2pld2s6z5zafg0m8gneylcj"
    
    const axelarAssetTransfer = new AxelarAssetTransfer({
        environment: Environment.MAINNET,
    });
    
    const axelarQuery = new AxelarQueryAPI({
        environment: Environment.MAINNET,
    });
    
    const token_denom = await axelarQuery.getDenomFromSymbol("axlUSDC", CHAINS.MAINNET.OSMOSIS);
    console.log("Denomination: ", token_denom)
    const token_amount = 1000

    const fee = await axelarQuery.getTransferFee(
        CHAINS.MAINNET.OSMOSIS,
        "secret-snip",
        token_denom,
        token_amount
    );

    console.log("Fee: ", fee)
    if(!fee) return

    const amountIn = (token_amount + Number(fee.fee.amount)).toString()

    const depositAddress = await axelarAssetTransfer.getDepositAddress({
        fromChain: CHAINS.MAINNET.OSMOSIS,
        toChain: "secret-snip",
        destinationAddress: receiver_account,
        asset: token_denom,
    });
    
    console.log("After getDepositAddress: ", depositAddress)

    //cosmojs
    const chain = chains.find(({ chain_name }) => chain_name === 'osmosis');
    const wallet = await getOfflineSigner({
        mnemonic: config.secrets.osmosis.osmosisMnemonic,
        chain
    });
    const accounts = await wallet.getAccounts()
    console.log("Account: ", accounts[0].address )
    // const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.secrets.osmosis.osmosisMnemonic);
    const client2 = await SigningStargateClient.connectWithSigner(
        osmoChainRPC,
        wallet,
    );
    console.log("Balance: ", await client2.getBalance(accounts[0].address, token_denom))
    console.log("Balances: ", await client2.getAllBalances(accounts[0].address))
    const memo = "Cross-chain fun";
    const fee2 = {
        amount: coins("6000", "uosmo"),
        gas: "2220000", // 222k
    };

    // both timeouts set
    const result = await client2.sendIbcTokens(
        sender_account,
        depositAddress, //uusdc
        coin(amountIn, "ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858"),
        "transfer",
        "channel-208",
        { revisionHeight: Long.fromNumber(123), revisionNumber: Long.fromNumber(456) },
        Math.floor(Date.now() / 1000) + 60,
        fee2,
        memo,
    );

    console.log("Transaction result: ", result)
}


main().catch((e) => {
    console.log(e)
})
