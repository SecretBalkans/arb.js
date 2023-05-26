import {
  SecretContractAddress, SerializedShadeContract,
  ShadeContract,
  ShadeRoutePoolEssential,
  Snip20Token,
  SnipPoolToken,
  StakingContract,
  TokenPriceInfo
} from "./types";
import {convertCoinFromUDenomV2, convertCoinToUDenomV2, fetchTimeout} from "../../utils";
import https from "https";
import _ from "lodash";
import BigNumber from "bignumber.js";

export let tokens;
export let pairs;

export class ShadePair {
  public readonly name: string;

  constructor(
    public readonly token0: SnipPoolToken,
    public readonly token1: SnipPoolToken,
    public readonly lpTokenInfo?: Snip20Token,
    public readonly rawInfo?: TokenPairInfoRaw,
    public readonly stakingContract?: ShadeContract | StakingContract) {
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

export interface TokenPairInfoRaw {
  id: string;
  contract: SerializedShadeContract;
  // factory: string;
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
  staking_contract?: {
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
  volume?: {
    'volume': string;
    'volume_24h_change': string;
    'volume_24h_change_perc': string;
  };
  fees?: {
    'dao': string;
    'lp': string;
  };
  liquidity?: string;
  liquidity_usd?: string;
  apy?: {
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
  currency?: string;
  flags: string[]; // derivative/stable
}

const shadeApiHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 5,
});

export async function getPairsRaw(cached = false): Promise<TokenPairInfoRaw[]> {
  pairs = cached || !pairs ? await fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/shadeswap/pairs', {
    agent: shadeApiHttpsAgent,
  }, 10000) : pairs;
  return pairs;
}

export async function initShadeTokens() {
  tokens = tokens || await fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/tokens', {
    agent: shadeApiHttpsAgent,
  });
}

export async function getTokenPrices(): Promise<TokenPriceInfo[]> {
  await initShadeTokens();
  return fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/token_prices', {
    agent: shadeApiHttpsAgent,
  }, 10000);
}

export const useTokens = () => ({
  getTokenDecimals
});

export function getTokenDecimals(tokenId: string): number {
  return _.find(tokens, {id: tokenId}).decimals;
}

export function parseRawPool(n: TokenPairInfoRaw, t0decimals: number, t1decimals: number): ShadeRoutePoolEssential {
  const vol = n.volume ? {
    volume: n.volume.volume,
    volume24HourChange: n.volume.volume_24h_change,
    volume24HourChangePercent: n.volume.volume_24h_change_perc,
  } : {
    volume: 0,
    volume24HourChange: 0,
    volume24HourChangePercent: 0,
  };
  let stable;
  !!n.stable_params ? stable = {
    priceRatio: BigNumber(n.stable_params.price_ratio),
    a: BigNumber(n.stable_params.a),
    gamma1: BigNumber(n.stable_params.gamma1),
    gamma2: BigNumber(n.stable_params.gamma2),
    minTradeSizeToken0For1: BigNumber(n.stable_params.min_trade_size_0_to_1),
    minTradeSizeToken1For0: BigNumber(n.stable_params.min_trade_size_1_to_0),
    maxPriceImpactAllowed: BigNumber(n.stable_params.max_price_impact_allowed),
  } : stable = null;
  const apy = n.apy?.reward_tokens?.map(rewardToken => ({
    tokenId: rewardToken.token_id,
    apy: rewardToken.apy,
  }));
  const e = {
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
    stableParams: stable,
    fees: {
      dao: BigNumber(n.fees.dao),
      liquidityProvider: BigNumber(n.fees.lp),
    },
    stakingContract: n.staking_contract ? {
      id: n.staking_contract.id,
      address: n.staking_contract.address,
      codeHash: n.staking_contract.code_hash,
    } : null,
    rewardTokens: apy,
    flags: n.flags,
    metrics: {
      liquidityRaw: n.liquidity,
      volume: {
        value: Number(vol.volume),
        changeAmount: Number(vol.volume24HourChange),
        changePercent: Number(vol.volume24HourChangePercent),
      },
      apy: n.apy?.total,
      currency: n.currency,
    },
  }
  const {
    id: o,
    contract: u,
    stakingContract: l,
    rewardTokens: k,
    lpTokenId: O,
    token0Id: v,
    token0AmountRaw: t0amnt,
    token1Id: d,
    token1AmountRaw: g,
    fees: m,
    stableParams: y,
    flags: b,
    metrics: C,
  } = e
  return {
    id: o,
    contract: {address: u.address as SecretContractAddress, codeHash: u.codeHash},
    token0Id: v,
    token0Amount: convertCoinFromUDenomV2(t0amnt, t0decimals),
    token1Id: d,
    token1Amount: convertCoinFromUDenomV2(g, t1decimals),
    lpTokenId: O,
    stableParams: y,
    fees: m,
    flags: b
  };
}

export function toRawShadePool(parsedPool: ShadeRoutePoolEssential, t0Decimals: number, t1Decimals: number): TokenPairInfoRaw {
  return {
    id: parsedPool.id,
    contract: {
      address: parsedPool.contract.address as SecretContractAddress,
      code_hash: parsedPool.contract.codeHash,
    },
    token_0: parsedPool.token0Id,
    token_0_amount: convertCoinToUDenomV2(parsedPool.token0Amount, t0Decimals).toFixed(0),
    token_1: parsedPool.token1Id,
    token_1_amount: convertCoinToUDenomV2(parsedPool.token1Amount, t1Decimals).toFixed(0),
    lp_token: parsedPool.lpTokenId,
    stable_params: parsedPool.stableParams
      ? {
        a: parsedPool.stableParams.a.toString(),
        gamma1: parsedPool.stableParams.gamma1.toString(),
        gamma2: parsedPool.stableParams.gamma2.toString(),
        min_trade_size_0_to_1: parsedPool.stableParams.minTradeSizeToken0For1.toString(),
        min_trade_size_1_to_0: parsedPool.stableParams.minTradeSizeToken1For0.toString(),
        max_price_impact_allowed: parsedPool.stableParams.maxPriceImpactAllowed.toString(),
        price_ratio: parsedPool.stableParams.priceRatio.toString(),
      }
      : null,
    fees: {
      dao: parsedPool.fees.dao.toString(),
      lp: parsedPool.fees.liquidityProvider.toString(),
    },
    flags: parsedPool.flags,
  };
}
