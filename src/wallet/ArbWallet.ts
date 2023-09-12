import {DirectSecp256k1Wallet, DirectSecp256k1HdWallet} from '@cosmjs/proto-signing';

import {AminoSignResponse, StdSignDoc, AccountData} from 'secretjsbeta/dist/wallet_amino';

import {Secp256k1Pen} from './Secp256k1Pen';
import {Secp256k1Wallet, StdSignature} from '@cosmjs/launchpad';
import {Bip39, EnglishMnemonic, Slip10, Slip10Curve, stringToPath} from '@cosmjs/crypto';
import {fromBase64, MsgExecuteContract, SecretNetworkClient} from 'secretjsbeta';

import {SignDoc} from 'secretjsbeta/dist/protobuf/cosmos/tx/v1beta1/tx';
import {serializeSignDoc, serializeStdSignDoc} from './signUtils';
import _ from 'lodash';
import {SecretContractAddress} from '../dex/shade/types';
export type ArbWalletConfig = { mnemonic?: string, privateHex?: string, secretNetworkViewingKey?: string, secretLcdUrlsMany?: string[], secretLcdUrlsRateLimitsMany?: number[] };

export enum ArbChain {
  SECRET,
  OSMO,
  SECRET_TESTNET
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
  private secretQueryClients: SecretNetworkClient[] = [];
  rateLimitedCalls: any = {};
  constructor(config: ArbWalletConfig) {
    this.config = config;
  }
  rateLimitedFn(fn, rateLimitMs, key) {
    let lastInvocationTime = Date.now();
    let inFlight = 0;
    console.log('rateLimit', key)
    const CONTRACT_MSG_CACHE = this.CONTRACT_MSG_CACHE;
    return async function (arg) {
      let cached;
      const cacheKey = `${arg.contractAddress}.${Object.getOwnPropertyNames(arg.msg)[0]}`;
      // tslint:disable-next-line:no-conditional-assignment
      if (arg.useResultCache && (cached = _.get(CONTRACT_MSG_CACHE, cacheKey))) {
        return {...cached, cached: true};
      }
      const now = Date.now();
      const timeSinceLastInvocation = now - lastInvocationTime;
      const timeUntilNextInvocation = Math.max(0, rateLimitMs * inFlight - timeSinceLastInvocation);

      inFlight++;
      lastInvocationTime = Date.now();

      if (timeUntilNextInvocation > 0) {
        await new Promise(resolve => setTimeout(resolve, timeUntilNextInvocation));
      }
      console.log(key, `wait ${timeUntilNextInvocation}`);

      const result = await fn(arg);
      inFlight--;
      if (arg.useResultCache) {
        _.set(CONTRACT_MSG_CACHE, cacheKey, result);
      }
      return result;
    };
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
      [ArbChain.SECRET_TESTNET]: {
        bech32Prefix: 'secret',
        coinType: 529,
        chainId: 'pulsar-2',
        name: 'Secret Testnet',
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
    const {bech32Prefix, coinType} = this.getChainConfig(chain);
    const mnemonic = this.config.mnemonic;
    if (mnemonic) {
      let parsedMnemonic = mnemonic;
      try {
        parsedMnemonic = Buffer.from(fromBase64(mnemonic)).toString('utf-8');
        // tslint:disable-next-line:no-empty
      } catch {
      }
      return await DirectSecp256k1HdWallet.fromMnemonic(parsedMnemonic, {
        hdPaths: [stringToPath(`m/44'/${coinType}'/${pathSuffix.includes('/') ? pathSuffix : `0'/0/${pathSuffix}`}`)],
        prefix: bech32Prefix,
      });
    } else {
      const privateKey = this.getPrivateKey();
      const uint8arr = new Uint8Array(privateKey);
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
        // tslint:disable-next-line:no-empty
      } catch {
      }
      const mnemonicChecked = new EnglishMnemonic(parsedMnemonic);
      const seed = await Bip39.mnemonicToSeed(mnemonicChecked);
      const path = stringToPath(`m/44'/${coinType}'/${pathSuffix.includes('/') ? pathSuffix : `0'/0/${pathSuffix}`}`);
      const {privkey} = Slip10.derivePath(Slip10Curve.Secp256k1, seed, path);
      return await Secp256k1Wallet.fromKey(privkey, bech32prefix);
    } else {
      const privateKey = this.getPrivateKey();
      const uint8arr = new Uint8Array(privateKey);
      return await Secp256k1Wallet.fromKey(uint8arr, bech32prefix);
    }
  }

  public async getSecretPen(): Promise<Secp256k1Pen> {
    const mnemonic = this.config.mnemonic;
    if (mnemonic) {
      let parsedMnemonic = mnemonic;
      try {
        parsedMnemonic = Buffer.from(fromBase64(mnemonic)).toString('utf-8');
        // tslint:disable-next-line:no-empty
      } catch {
      }
      return await Secp256k1Pen.fromMnemonic(parsedMnemonic);
    } else {
      const privateKey = this.getPrivateKey();
      const uint8arr = new Uint8Array(privateKey);
      return await Secp256k1Pen.fromKey(uint8arr);
    }
  }

  public async getSecretSigner() {
    const pen = await this.getSecretPen();
    return async (bytes: Uint8Array): Promise<StdSignature> => {
      return pen.sign(bytes);
    };
  };

  public async getSecretNetworkClient({
                                        chain = ArbChain.SECRET,
                                        parallelizeQueryIndex,
                                      }: { chain?: ArbChain, parallelizeQueryIndex?: number } = {}): Promise<SecretNetworkClient> {
    const queryClientIndex = this.getQueryClientIndex(parallelizeQueryIndex);
    const isForQueryClient = parallelizeQueryIndex !== undefined;
    if (isForQueryClient && !this.secretQueryClients[queryClientIndex] || (!isForQueryClient && !this.secretClient)) {
      const url = this.config.secretLcdUrlsMany[queryClientIndex];
      const getSecretPen = this.getSecretPen.bind(this);
      const senderAddress = isForQueryClient ? null : await this.getAddress(chain);
      const client = new SecretNetworkClient({
        url,
        wallet: {
          async signAmino(
            signerAddress: string,
            signDoc: StdSignDoc,
          ): Promise<AminoSignResponse> {
            if (isForQueryClient) {
              throw new Error('Query only secret client cannot be used for signing');
            }
            const accounts = await this.getAccounts();
            if (!accounts.find(a => a.address === signerAddress)) {
              throw new Error(`Address ${signerAddress} not found in wallet`);
            }
            const signer = await this.getSecretSigner();

            const signature = await signer(serializeStdSignDoc(signDoc));

            return {
              signed: {
                ...signDoc,
              },
              signature,
            };
          },
          async signDirect(signerAddress: string, signDoc: SignDoc): Promise<{
            readonly signed: SignDoc;
            readonly signature: StdSignature;
          }> {
            if (isForQueryClient) {
              throw new Error('Query only secret client cannot be used for signing');
            }
            const accounts = await this.getAccounts();
            if (!accounts.find(a => a.address === signerAddress)) {
              throw new Error(`Address ${signerAddress} not found in wallet`);
            }
            const signer = await this.getSecretSigner();

            const signature = await signer(await serializeSignDoc(signDoc));
            return {
              signed: {
                ...signDoc,
              },
              signature,
            };
          },
          async getAccounts(): Promise<readonly AccountData[]> {
            if (isForQueryClient) {
              throw new Error('Query only secret client cannot be used for signing');
            }
            return [
              {
                address: senderAddress,
                algo: 'secp256k1',
                pubkey: (await getSecretPen()).pubkey,
              },
            ];
          },
        },
        chainId: this.getChainConfig(chain).chainId,
        walletAddress: senderAddress,
      });
      if (isForQueryClient) {
        this.secretQueryClients[queryClientIndex] = client;
      } else {
        this.secretClient = client;
      }
    }

    return isForQueryClient ? this.secretQueryClients[queryClientIndex] : this.secretClient;
  }

  private getQueryClientIndex(parallelizeQueryIndex: number) {
    return parallelizeQueryIndex % this.config.secretLcdUrlsMany.length;
  }

  public async getAddress(chain: ArbChain, suffix = '0'): Promise<string> {
    const wallet = await this.setupWallet(chain, suffix);
    const [firstAccount] = await wallet.getAccounts();
    return firstAccount.address;
  }

  /**
   * Query a secret smart contract by address and by passing a msg
   * @param contractAddress string The address of the contract to query
   * @param msg object A JSON object that will be passed to the contract as a query
   * @param parallelizeQueryIndex
   * @param codeHash optional for faster resolution
   * @param useResultCache allow caching of result. Useful if querying static blockchain data
   */
  public async querySecretContract<T extends object, R extends any>({
                                                                      contractAddress,
                                                                      msg,
                                                                      parallelizeQueryIndex,
                                                                      codeHash,
                                                                      useResultCache = false
                                                                    }: { contractAddress: SecretContractAddress, msg: T, parallelizeQueryIndex: number, codeHash?: string, useResultCache?: boolean }) {
    const key = `${this.getQueryClientIndex(parallelizeQueryIndex)}`;
    if(!this.rateLimitedCalls[key]) {
      const func = async ({
                            contractAddress: _contractAddress,
                            msg: _msg,
                            parallelizeQueryIndex: _parallelizeQueryIndex,
                            codeHash: _codeHash,
                          }) => {
        const client = await this.getSecretNetworkClient({ parallelizeQueryIndex: _parallelizeQueryIndex });
        if (_codeHash || !this.CODE_HASH_CACHE[_contractAddress]) {
          this.CODE_HASH_CACHE[_contractAddress] = (await client.query.compute.codeHashByContractAddress({ contract_address: _contractAddress })).code_hash;
        } else {
          await new Promise((resolve) => setImmediate(resolve));
        }
        const result = await client.query.compute.queryContract<T, R>({
          code_hash: _codeHash || this.CODE_HASH_CACHE[_contractAddress],
          contract_address: _contractAddress,
          query: _msg,
        });
        if (result) {
          this.CODE_HASH_CACHE[_contractAddress] = this.CODE_HASH_CACHE[_contractAddress] || _codeHash;
          return result;
        }
      };
      this.rateLimitedCalls[key] = this.rateLimitedFn(func,
        this.config.secretLcdUrlsRateLimitsMany[this.getQueryClientIndex(parallelizeQueryIndex)], key);
    }
    try {
      return await (this.rateLimitedCalls[key])(...arguments);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Broadcast a handle/execute tx/msg to a secret smart contract by address, wait for execution and return result.
   * @param contractAddress The address of the contract to submit a tx to
   * @param msg A JSON object that will be passed to the contract as a handle msg
   * @param gasPrice
   * @param gasLimit
   */
  public async executeSecretContract(contractAddress: string, msg: any, gasPrice = 0.015, gasLimit = 1700000) {
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
