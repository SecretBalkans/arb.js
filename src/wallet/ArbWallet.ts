import { DirectSecp256k1Wallet, DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

import { AminoSignResponse, StdSignDoc, AccountData } from 'secretjsbeta/dist/wallet_amino';

import { Secp256k1Pen } from './Secp256k1Pen';
import { Secp256k1Wallet, StdSignature } from '@cosmjs/launchpad';
import { Bip39, EnglishMnemonic, Slip10, Slip10Curve, stringToPath } from '@cosmjs/crypto';
import { fromBase64, MsgExecuteContract, SecretNetworkClient } from 'secretjsbeta';

import { SignDoc } from 'secretjsbeta/dist/protobuf/cosmos/tx/v1beta1/tx';
import { serializeSignDoc, serializeStdSignDoc } from './signUtils';
import _ from 'lodash';

export type ArbWalletConfig = { mnemonic?: string, privateHex?: string, secretNetworkViewingKey: string };

export enum ArbChain {
  SECRET,
  OSMO
}

export type ArbChainConfig = {
  name: string,
  coinType: number,
  bech32Prefix: string,
  chainId: string,
}

export class ArbWallet {
  private readonly config: ArbWalletConfig;
  private readonly CODE_HASH_CACHE = {};
  private readonly CONTRACT_MSG_CACHE = {};
  private secretClient: SecretNetworkClient;

  constructor(config: ArbWalletConfig) {
    this.config = config;
    if (!this.config.mnemonic && !this.config.privateHex) {
      throw new Error(`Config ./.secrets.js should contain valid cosmos: { privateHex: "i.e. keplr private hex string" } OR cosmos: { mnemonic: "space separated words" }`);
    }
  }

  private getChainConfig(chain: ArbChain): ArbChainConfig {
    return {
      [ArbChain.SECRET]: {
        bech32Prefix: 'secret',
        coinType: 529,
        chainId: 'secret-4',
        name: 'Secret Network',
      },
      [ArbChain.OSMO]: {
        coinType: 118,
        bech32Prefix: 'osmo',
        chainId: 'osmosis-1',
        name: 'Osmosis',
      },
    }[chain];
  }

  private getPrivateKey() {
    return Buffer.from(this.config.privateHex, 'hex');
  }

  private async setupWallet(
    chain: ArbChain,
    pathSuffix = '0',
  ) {
    const { bech32Prefix, coinType } = this.getChainConfig(chain);
    const mnemonic = this.config.mnemonic;
    if (mnemonic) {
      let parsedMnemonic = mnemonic;
      try {
        parsedMnemonic = Buffer.from(fromBase64(mnemonic)).toString('utf-8');
      } catch {
      }
      return await DirectSecp256k1HdWallet.fromMnemonic(parsedMnemonic, {
        hdPaths: [stringToPath(`m/44'/${coinType}'/${pathSuffix.includes('/') ? pathSuffix : `0'/0/${pathSuffix}`}`)],
        prefix: bech32Prefix,
      });
    } else {
      const privateKey = this.getPrivateKey();
      let uint8arr = new Uint8Array(privateKey);
      return await DirectSecp256k1Wallet.fromKey(uint8arr, bech32Prefix);
    }
  }

  public async setupAminoWallet(
    bech32prefix: string,
    coinType = 118,
    pathSuffix: '0',
  ): Promise<Secp256k1Wallet> {
    const mnemonic = this.config.mnemonic;
    if (mnemonic) {
      let parsedMnemonic = mnemonic;
      try {
        parsedMnemonic = Buffer.from(fromBase64(mnemonic)).toString('utf-8');
      } catch {
      }
      const mnemonicChecked = new EnglishMnemonic(parsedMnemonic);
      const seed = await Bip39.mnemonicToSeed(mnemonicChecked);
      const path = stringToPath(`m/44'/${coinType}'/${pathSuffix.includes('/') ? pathSuffix : `0'/0/${pathSuffix}`}`);
      const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, path);
      return await Secp256k1Wallet.fromKey(privkey, bech32prefix);
    } else {
      const privateKey = this.getPrivateKey();
      let uint8arr = new Uint8Array(privateKey);
      return await Secp256k1Wallet.fromKey(uint8arr, bech32prefix);
    }
  }

  public async getSecretPen(): Promise<Secp256k1Pen> {
    const mnemonic = this.config.mnemonic;
    if (mnemonic) {
      let parsedMnemonic = mnemonic;
      try {
        parsedMnemonic = Buffer.from(fromBase64(mnemonic)).toString('utf-8');
      } catch {
      }
      return await Secp256k1Pen.fromMnemonic(parsedMnemonic);
    } else {
      const privateKey = this.getPrivateKey();
      let uint8arr = new Uint8Array(privateKey);
      return await Secp256k1Pen.fromKey(uint8arr);
    }
  }

  public async getSecretSigner() {
    let pen = await this.getSecretPen();
    return async (bytes: Uint8Array): Promise<StdSignature> => {
      return pen.sign(bytes);
    };
  };

  public async getSecretNetworkClient(chain = ArbChain.SECRET, url: string = 'https://lcd.secret.express'): Promise<SecretNetworkClient> {
    if (!this.secretClient) {
      const senderAddress = await this.getAddress(chain);
      const signer = await this.getSecretSigner();
      this.secretClient = new SecretNetworkClient({
        url: url,
        wallet: {
          async signAmino(
            signerAddress: string,
            signDoc: StdSignDoc,
          ): Promise<AminoSignResponse> {

            const accounts = await this.getAccounts();
            if (!accounts.find(a => a.address === signerAddress)) {
              throw new Error(`Address ${signerAddress} not found in wallet`);
            }

            const signature = await signer(serializeStdSignDoc(signDoc));

            return {
              signed: {
                ...signDoc,
              },
              signature: signature,
            };
          },
          async signDirect(signerAddress: string, signDoc: SignDoc): Promise<{
            readonly signed: SignDoc;
            readonly signature: StdSignature;
          }> {
            const accounts = await this.getAccounts();
            if (!accounts.find(a => a.address === signerAddress)) {
              throw new Error(`Address ${signerAddress} not found in wallet`);
            }

            const signature = await signer(await serializeSignDoc(signDoc));
            return {
              signed: {
                ...signDoc,
              },
              signature,
            };
          },
          async getAccounts(): Promise<readonly AccountData[]> {
            return [
              {
                address: senderAddress,
                algo: 'secp256k1',
                pubkey: (await this.getSecretPen()).pubkey,
              },
            ];
          },
        },
        chainId: this.getChainConfig(chain).chainId,
        walletAddress: senderAddress,
      });
    }

    return this.secretClient;
  }

  public async getAddress(chain: ArbChain, suffix = '0'): Promise<string> {
    const wallet = await this.setupWallet(chain, suffix);
    const [firstAccount] = await wallet.getAccounts();
    return firstAccount.address;
  }

  /**
   * Gets the secret balance of an asset by address and decimals to pass.
   * TODO: just pass decimals and handle SNIP-20/SNIP-25 by querying token info and fetching the decimals
   @param asset.address string
   @param asset.decimals number
   * */
  public async getSecretBalance(asset: { address: string, decimals: number }): Promise<number> {
    const client = await this.getSecretNetworkClient();
    const result = await this.querySecretContract(asset.address, {
      balance: {
        key: this.config.secretNetworkViewingKey,
        address: client.address,
      },
    }) as any;
    if (result.viewing_key_error?.msg === 'Wrong viewing key for this address or viewing key not set') {
      await this.executeSecretContract(asset.address, {
        set_viewing_key: {
          key: this.config.secretNetworkViewingKey,
        },
      }, 0.00155);
      return this.getSecretBalance(asset);
    }
    return +result.balance.amount / (10 ** asset.decimals);
  }

  /**
   * Query a secret smart contract by address and by passing a msg
   * @param contractAddress string The address of the contract to query
   * @param msg object A JSON object that will be passed to the contract as a query
   * @param codeHash optional for faster resolution
   */
  public async querySecretContract<T extends object, R extends any>(contractAddress: string, msg: T, codeHash?: string, useResultCache = false) {
    const client = await this.getSecretNetworkClient();
    if (codeHash || !this.CODE_HASH_CACHE[contractAddress]) {
      this.CODE_HASH_CACHE[contractAddress] = (await client.query.compute.codeHashByContractAddress({ contract_address: contractAddress })).code_hash;
    }
    let cached;
    const cacheKey = `${contractAddress}.${Object.getOwnPropertyNames(msg)[0]}`;
    if (useResultCache && (cached = _.get(this.CONTRACT_MSG_CACHE, cacheKey))) {
      return cached;
    }
    const result = await client.query.compute.queryContract<T, R>({
      code_hash: codeHash || this.CODE_HASH_CACHE[contractAddress],
      contract_address: contractAddress,
      query: msg,
    });
    if (result) {
      if (useResultCache) {
        _.set(this.CONTRACT_MSG_CACHE, cacheKey, result);
      }
      this.CODE_HASH_CACHE[contractAddress] = this.CODE_HASH_CACHE[contractAddress] || codeHash;
      return result;
    }
  }

  /**
   * Broadcast a handle/execute tx/msg to a secret smart contract by address, wait for execution and return result.
   * @param contractAddress The address of the contract to submit a tx to
   * @param msg A JSON object that will be passed to the contract as a handle msg
   * @param gasPrice
   * @param gasLimit
   */
  public async executeSecretContract(contractAddress: string, msg: any, gasPrice = 0.001, gasLimit = 113000) {
    const client = await this.getSecretNetworkClient();
    if (!this.CODE_HASH_CACHE[contractAddress]) {
      this.CODE_HASH_CACHE[contractAddress] = (await client.query.compute.codeHashByContractAddress({
        contract_address: contractAddress,
      })).code_hash;
    }

    return await client.tx.broadcast([new MsgExecuteContract({
      contract_address: contractAddress,
      code_hash: this.CODE_HASH_CACHE[contractAddress],
      sender: client.address,
      msg,
    })], {
      waitForCommit: true,
      gasLimit,
      gasPriceInFeeDenom: gasPrice,
      feeDenom: 'uscrt',
    });
  }
}
