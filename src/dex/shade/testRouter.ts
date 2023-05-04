import { Wallet, SecretNetworkClient } from "secretjs"

async function main(){

    // Secret.js Client
    let secretjs: SecretNetworkClient
    
    const wallet = new Wallet(
      "grant rice replace explain federal release fix clever romance raise often wild taxi quarter soccer fiber love must tape steak together observe swap guitar"
    )
    
    // Get environment variables from .env
    const secretChainUrl = "https://rpc.pulsar.scrttestnet.com/"
    const routerCode = "" 
    const routerHash = ""
    const routerAddress = "" 
    
    secretjs = await new SecretNetworkClient({
        url: secretChainUrl,
        chainId: "pulsar-2",
        wallet: wallet,
        walletAddress: wallet.address,
    })

    const swap = async () => {
        const tx = await secretjs.tx.compute.executeContract(
            {
                sender: wallet.address,
                contract_address: routerAddress,
                code_hash: routerHash,
                msg: {
                  increment: {},
                },
              },
              {
                gasLimit: 1_000_000,
              }
        )
    }
}

main().catch((e) => {
    console.log(e)
})
