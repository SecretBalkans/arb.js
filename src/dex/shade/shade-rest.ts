import { fetchTimeout } from '../../utils';
import _ from 'lodash';
import Aigle from 'aigle';
import { ArbWallet } from '../../wallet/ArbWallet';
import BigNumber from 'bignumber.js';
import { convertCoinFromUDenomV2 } from '../../utils';
import config from "../../config";
import https from 'https';
import { Token } from '../types/swap-types';
import { Contract, PoolToken, SecretContractAddress, Snip20Token, StakingContract, TokenPriceInfo } from './types';

//TODO: Convert to ShadeSDK with init,subscribe functions to keep a
// local up to date state of pools,peg,borrows,etc. updated each block and
// functions to calculate swaps, borrows
// and finally to implement a common functionality (with other dex's,dapps) for swap, lend, repay, pool, etc.
let arb = new ArbWallet({
  secretLcdUrl: 'https://lcd.spartanapi.dev',
  mnemonic: config.secrets.cosmos.mnemonic,
  privateHex: config.secrets.cosmos.privateHex,
  secretNetworkViewingKey: config.secrets.secret.apiKey
});

export async function getPegPrice(): Promise<number> {
  return (await fetchTimeout('https://8oa7njf3h7.execute-api.us-east-1.amazonaws.com/prod/peg', {}, 10000)).graphData[0].pegPrice;
}

export let tokens;
export let pairs;

export async function getTokenPrices(): Promise<TokenPriceInfo[]> {
  tokens = tokens || await fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/tokens', {
    agent: shadeApiHttpsAgent
  });
  return fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/token_prices', {
    agent: shadeApiHttpsAgent
  }, 10000);
}

class ShadePair {
  public readonly name: string;

  constructor(
    public readonly token0: PoolToken,
    public readonly token1: PoolToken,
    public readonly lpTokenInfo?: Snip20Token,
    public readonly rawInfo?: TokenPairInfoRaw,
    public readonly stakingContract?: Contract | StakingContract) {
    this.name = lpTokenInfo.symbol;
  }

  public get token0PoolPrice() {
    return this.token0.amount * this.token0.price;
  }

  public get token1PoolPrice() {
    return this.token1.amount * this.token1.price;
  }

  public get skew() {
    return this.skewSign * this.skewPercentage;
  }

  public get skewSign() {
    const p0 = this.token0PoolPrice;
    const p1 = this.token1PoolPrice;
    return (Math.sign(p0 - p1) > 0 ? -1 : 1);
  }

  public get skewPercentage() {
    const p0 = this.token0PoolPrice;
    const p1 = this.token1PoolPrice;
    return Math.abs(p0 - p1) / Math.min(p0, p1);
  }
}

export async function getShadePairs(): Promise<ShadePair[]> {
  const prices = await getTokenPrices();
  const pairs = await getPairsRaw();
  return Aigle.mapLimit(pairs, 6, async pr => {
    return await getTokenPairInfo(pr, prices);
  });
}

export interface TokenPairInfoRaw {
  id: string;
  contract: Contract;
  factory: string;
  /**
   * token_0 : "06180689-1c8e-493d-a19f-71dbc5dddbfc"
   * token_0_amount : "132661431360"
   * token_1 : "7524b771-3540-4829-aff1-c6d42b424e61"
   * token_1_amount : "499623041187"
   */
  token_0: string;
  token_0_amount: string;
  token_1: string;
  token_1_amount: string;
  lp_token: string;
  staking_contract: {
    'id': string;
    'address': string;
    'code_hash': string;
  };
  /**
   * {
   *     "a": "150",
   *     "gamma1": "2",
   *     "gamma2": "50",
   *     "min_trade_size_0_to_1": "0.0001",
   *     "min_trade_size_1_to_0": "0.0001",
   *     "max_price_impact_allowed": "1000",
   *     "price_ratio": "0.948439957804714905975629335"
   *   }
   */
  stable_params: {
    'a': string;
    'gamma1': string;
    'gamma2': string;
    'min_trade_size_0_to_1': string;
    'min_trade_size_1_to_0': string;
    'max_price_impact_allowed': string;
    'price_ratio': string;
  };
  volume: {
    'volume': string;
    'volume_24h_change': string;
    'volume_24h_change_perc': string;
  };
  fees: {
    'dao': string;
    'lp': string;
  };
  liquidity: string;
  liquidity_usd: string;
  apy: {
    'total': number;
    'reward_tokens': [
      {
        'token_id': string;
        'apy': number;
        'percentage_of_total': number;
      },
      {
        'token_id': string;
        'apy': number;
        'percentage_of_total': number;
      }
    ];
  };
  currency: string;
  flags: string[]; // derivative/stable
}

const shadeApiHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 5,
});

export async function getPairsRaw(): Promise<TokenPairInfoRaw[]> {
  pairs = pairs || await fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/shadeswap/pairs', {
    agent: shadeApiHttpsAgent
  }, 10000);
  return pairs;
}

function fromDenomString(inputAmount: string, decimals: number): number {
  const amount = BigInt(inputAmount);
  return +(amount / BigInt(10 ** decimals)).toString();
}

async function getTokenPairInfo(rawInfo: TokenPairInfoRaw, prices: TokenPriceInfo[]): Promise<ShadePair> {
  const lpToken = _.find(tokens, { id: rawInfo.lp_token });
  const token0 = _.find(tokens, { id: rawInfo.token_0 });
  const token1 = _.find(tokens, { id: rawInfo.token_1 });

  const [{ token_info: lpTokenInfo }, { token_info: t0 }, { token_info: t1 }] = await Aigle.all([arb.querySecretContract<any, {
    'token_info': Snip20Token
  }>(lpToken.contract_address, { 'token_info': {} }, lpToken.code_hash, true),
    arb.querySecretContract<any, {
      'token_info': Snip20Token
    }>(token0.contract_address, { 'token_info': {} }, token0.code_hash, true),
    arb.querySecretContract<any, {
      'token_info': Snip20Token
    }>(token1.contract_address, { 'token_info': {} }, token1.code_hash, true),
  ]);
  const { get_pair_info: pairInfo} = await arb.querySecretContract<any, {
    'get_pair_info': {
      amount_0: string,
      amount_1: string,
    }
  }>(rawInfo.contract.address as SecretContractAddress, { 'get_pair_info': {} }, rawInfo.contract.code_hash)
  const price0 = +_.find(prices, { id: token0.price_id })?.value;
  const price1 = +_.find(prices, { id: token1.price_id })?.value;
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
  }, lpTokenInfo, rawInfo, { address: rawInfo.staking_contract.address as SecretContractAddress, code_hash: rawInfo.staking_contract.code_hash});
}


export const TheStore = () => ({
  pools: parsePoolsRaw(pairs),
  getPoolById: (poolId: string) => parseRawPool(parsePool$1(_.find(pairs, { id: poolId}))),
  isStablePool: (poolId: string) => TheStore().getPoolById(poolId).stableParams !== null
})

export const useTokens = () => ({
  getTokenDecimals(tokenId: string): number {
    return _.find(tokens, { id: tokenId }).decimals;
  },
})

export function parsePoolsRaw(e: TokenPairInfoRaw[]): { [p: string]: { stakingContract: any; fees: any; token0Id: any; contract: any; token1Id: any; flags: any; token0Amount: BigNumber; rewardTokens: any; stableParams: any; id: any; lpTokenId: any; metrics: { volume: any; liquidity: BigNumber; currency: any; apy: any }; token1Amount: BigNumber } } {
  return e.reduce((t, n) => {
      const o = n.volume ? {
        volume: n.volume.volume,
        volume24HourChange: n.volume.volume_24h_change,
        volume24HourChangePercent: n.volume.volume_24h_change_perc,
      } : {
        volume: 0,
        volume24HourChange: 0,
        volume24HourChangePercent: 0,
      };
      let d;
      n.stable_params !== null ? d = {
        priceRatio: BigNumber(n.stable_params.price_ratio),
        a: BigNumber(n.stable_params.a),
        gamma1: BigNumber(n.stable_params.gamma1),
        gamma2: BigNumber(n.stable_params.gamma2),
        minTradeSizeToken0For1: BigNumber(n.stable_params.min_trade_size_0_to_1),
        minTradeSizeToken1For0: BigNumber(n.stable_params.min_trade_size_1_to_0),
        maxPriceImpactAllowed: BigNumber(n.stable_params.max_price_impact_allowed),
      } : d = null;
      const u = n.apy.reward_tokens.map(C => ({
        tokenId: C.token_id,
        apy: C.apy,
      }));
      return {
        ...t,
        [n.id]: parseRawPool({
          id: n.id,
          contract: {
            address: n.contract.address,
            codeHash: n.contract.code_hash,
          },
          token0Id: n.token_0,
          token0AmountRaw: n.token_0_amount,
          token1Id: n.token_1,
          token1AmountRaw: n.token_1_amount,
          lpTokenId: n.lp_token,
          stableParams: d,
          fees: {
            dao: BigNumber(n.fees.dao),
            liquidityProvider: BigNumber(n.fees.lp),
          },
          stakingContract: {
            id: n.staking_contract.id,
            address: n.staking_contract.address,
            codeHash: n.staking_contract.code_hash,
          },
          rewardTokens: u,
          flags: n.flags,
          metrics: {
            liquidityRaw: n.liquidity,
            volume: {
              value: Number(o.volume),
              changeAmount: Number(o.volume24HourChange),
              changePercent: Number(o.volume24HourChangePercent),
            },
            apy: n.apy.total,
            currency: n.currency,
          },
        }),
      };
    }, {});
}

function parseRawPool(e): { stakingContract: any; fees: any; token0Id: any; contract: any; token1Id: any; flags: any; token0Amount: BigNumber; rewardTokens: any; stableParams: any; id: any; lpTokenId: any; metrics: { volume: any; liquidity: BigNumber; currency: any; apy: any }; token1Amount: BigNumber } {
  const t = useTokens()
    , {getTokenDecimals: getTokenDecimals} = t
    , {id: o, contract: u, stakingContract: l, rewardTokens: k, lpTokenId: O, token0Id: v, token0AmountRaw: _, token1Id: d, token1AmountRaw: g, fees: m, stableParams: y, flags: b, metrics: C} = e
    , {liquidityRaw: P, volume: w, apy: E, currency: U} = C
    , T = getTokenDecimals(v)
    , te = getTokenDecimals(d)
    , $ = getTokenDecimals(O);
  return {
    id: o,
    contract: u,
    token0Id: v,
    token0Amount: convertCoinFromUDenomV2(_, T),
    token1Id: d,
    token1Amount: convertCoinFromUDenomV2(g, te),
    lpTokenId: O,
    stableParams: y,
    fees: m,
    stakingContract: l,
    rewardTokens: k,
    flags: b,
    metrics: {
      liquidity: convertCoinFromUDenomV2(P, $),
      volume: w,
      apy: E,
      currency: U
    }
  }
}

function parsePool$1(e: TokenPairInfoRaw) {
  const t = e.volume ? {
    volume: e.volume.volume,
    volume24HourChange: e.volume.volume_24h_change,
    volume24HourChangePercent: e.volume.volume_24h_change_perc,
  } : {
    volume: '0',
    volume24HourChange: '0',
    volume24HourChangePercent: '0',
  };
  let n;
  e.stable_params !== null ? n = {
    priceRatio: BigNumber(e.stable_params.price_ratio),
    a: BigNumber(e.stable_params.a),
    gamma1: BigNumber(e.stable_params.gamma1),
    gamma2: BigNumber(e.stable_params.gamma2),
    minTradeSizeToken0For1: BigNumber(e.stable_params.min_trade_size_0_to_1),
    minTradeSizeToken1For0: BigNumber(e.stable_params.min_trade_size_1_to_0),
    maxPriceImpactAllowed: BigNumber(e.stable_params.max_price_impact_allowed),
  } : n = null;
  const o = e.apy.reward_tokens.map(d => ({
    tokenId: d.token_id,
    apy: d.apy,
  }));
  return {
    id: e.id,
    contract: {
      address: e.contract.address,
      codeHash: e.contract.code_hash,
    },
    token0Id: e.token_0,
    token0AmountRaw: e.token_0_amount,
    token1Id: e.token_1,
    token1AmountRaw: e.token_1_amount,
    lpTokenId: e.lp_token,
    stableParams: n,
    fees: {
      dao: BigNumber(e.fees.dao),
      liquidityProvider: BigNumber(e.fees.lp),
    },
    rewardTokens: o,
    stakingContract: {
      id: e.staking_contract.id,
      address: e.staking_contract.address,
      codeHash: e.staking_contract.code_hash,
    },
    flags: e.flags,
    metrics: {
      liquidityRaw: e.liquidity,
      volume: {
        value: Number(t.volume),
        changeAmount: Number(t.volume24HourChange),
        changePercent: Number(t.volume24HourChangePercent),
      },
      apy: e.apy.total,
      currency: e.currency,
    },
  };
}
