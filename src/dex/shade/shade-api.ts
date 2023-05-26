/* tslint:disable:one-variable-per-declaration */
import {fetchTimeout, Logger} from '../../utils';
import _ from 'lodash';
import Aigle from 'aigle';
import {ArbWallet} from '../../wallet/ArbWallet';
import config from '../../config';
import {
  SecretContractAddress,
  Snip20Token,
  TokenPriceInfo,
} from './types';
import {safeJsonStringify} from '../../utils/safe-json-stringify';
import {ShadeRoutePoolEssentialsIdMap} from "./shade-calc";
import {
  getPairsRaw,
  getTokenPrices,
  parseRawPool,
  ShadePair,
  TokenPairInfoRaw,
  tokens,
  useTokens
} from './shade-api-utils';

const arb = new ArbWallet({
  // secretLcdUrl: 'https://lcd.secret.express',
  secretLcdUrl: 'https://lcd-secret.keplr.app',
  // secretLcdUrl: 'https://secret-api.lavenderfive.com:443',
  mnemonic: config.secrets.cosmos.mnemonic,
  privateHex: config.secrets.cosmos.privateHex,
  secretNetworkViewingKey: config.secrets.secret.apiKey,
});


export async function getPegPrice(): Promise<number> {
  return (await fetchTimeout('https://8oa7njf3h7.execute-api.us-east-1.amazonaws.com/prod/peg', {}, 10000)).graphData[0].pegPrice;
}

const logger = new Logger('ShadeRest');

export async function getShadePairs(cached: boolean): Promise<ShadePair[]> {
  const prices = await getTokenPrices();
  const pairInfoRaws = await getPairsRaw(cached);
  return Aigle.mapLimit(pairInfoRaws.filter(d => +d.token_0_amount > 10), 5, async cachePairInfo => {
    for (let i = 0; i < 3; i++) {
      try {
        return await getTokenPairInfo(cachePairInfo, prices, cached);
      } catch (err) {
        logger.debugOnce('getTokenPairInfo', err);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return;
  });
}

function fromDenomString(inputAmount: string, decimals: number): number {
  const amount = BigInt(inputAmount);
  return +(amount / BigInt(10 ** decimals)).toString();
}

function getTokenQueryLogInfo(token0: any, token1: any, rawInfo?: any) {
  return JSON.stringify({
    token0: token0.name,
    token1: token1.name, ...(rawInfo ? {contract: rawInfo.contract.address} : {})
  });
}

async function getTokenPairInfo(rawInfo: TokenPairInfoRaw, prices: TokenPriceInfo[], cached = false): Promise<ShadePair> {
  const lpToken = _.find(tokens, {id: rawInfo.lp_token});
  const token0 = _.find(tokens, {id: rawInfo.token_0});
  const token1 = _.find(tokens, {id: rawInfo.token_1});
  let tokenInfos;
  try {
    tokenInfos = await Aigle.all([
      arb.querySecretContract<any, {
        'token_info': Snip20Token
      }>(lpToken.contract_address, {'token_info': {}}, lpToken.code_hash, true),
      arb.querySecretContract<any, {
        'token_info': Snip20Token
      }>(token0.contract_address, {'token_info': {}}, token0.code_hash, true),
      arb.querySecretContract<any, {
        'token_info': Snip20Token
      }>(token1.contract_address, {'token_info': {}}, token1.code_hash, true),
    ]);
  } catch (err) {
    throw new Error(`Get the token_infos ${getTokenQueryLogInfo(token0, token1)}: ${safeJsonStringify(err)}`);
  }
  const [{token_info: lpTokenInfo}, {token_info: t0}, {token_info: t1}] = tokenInfos;
  let pairInfoResult;
  try {
    pairInfoResult = await arb.querySecretContract<any, {
      'get_pair_info': {
        amount_0: string,
        amount_1: string,
      }
    }>(rawInfo.contract.address as SecretContractAddress,
      {'get_pair_info': {}},
      rawInfo.contract.code_hash, cached);
  } catch (err) {
    throw new Error(`Get the get_pair_info ${getTokenQueryLogInfo(token0, token1, rawInfo)} ${err.message} ${err.stack}`);
  }
  const {get_pair_info: pairInfo} = pairInfoResult;
  const price0 = +_.find(prices, {id: token0.price_id})?.value;
  const price1 = +_.find(prices, {id: token1.price_id})?.value;

  if (cached) {
    // Use shade api
    pairInfo.amount_0 = rawInfo.token_0_amount;
    pairInfo.amount_1 = rawInfo.token_1_amount;
  } else {
    // Update cached rawInfo amounts
    rawInfo.token_0_amount = pairInfo.amount_0;
    rawInfo.token_1_amount = pairInfo.amount_1;
  }
  return new ShadePair({
    ...t0,
    address: token0.contract_address,
    code_hash: token0.code_hash,
    amount: fromDenomString(pairInfo.amount_0, t0.decimals),
    price: price0,
  }, {
    ...t1,
    address: token1.contract_address,
    code_hash: token1.code_hash,
    amount: fromDenomString(pairInfo.amount_1, t1.decimals),
    price: price1,
  }, lpTokenInfo, rawInfo, {
    address: rawInfo.staking_contract.address as SecretContractAddress,
    code_hash: rawInfo.staking_contract.code_hash,
  });
}

export function parsePoolsRaw(rawPairsInfo: TokenPairInfoRaw[], t0decimals?: number, t1decimals?: number): ShadeRoutePoolEssentialsIdMap {
  const t = useTokens()
    , {getTokenDecimals: getTokenDecimals} = t
  return rawPairsInfo.reduce((agg, n) => {
    try {
      return {
        ...agg,
        [n.id]: parseRawPool(n, t0decimals || getTokenDecimals(n.token_0), t1decimals || getTokenDecimals(n.token_1)),
      };
    } catch (err) {
      logger.log(err.message);
    }
  }, {});
}