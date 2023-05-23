import {ShadeContract, Snip20Token, SnipPoolToken, StakingContract, TokenPriceInfo} from "./types";
import {fetchTimeout} from "../../utils";
import https from "https";
import _ from "lodash";

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
  contract: ShadeContract;
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

export async function getPairsRaw(cached = false): Promise<TokenPairInfoRaw[]> {
  pairs = cached || !pairs? await fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/shadeswap/pairs', {
    agent: shadeApiHttpsAgent,
  }, 10000) : pairs;
  return pairs;
}
export async function getTokenPrices(): Promise<TokenPriceInfo[]> {
  tokens = tokens || await fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/tokens', {
    agent: shadeApiHttpsAgent,
  });
  return fetchTimeout('https://na36v10ce3.execute-api.us-east-1.amazonaws.com/API-mainnet-STAGE/token_prices', {
    agent: shadeApiHttpsAgent,
  }, 10000);
}

export const useTokens = () => ({
  getTokenDecimals(tokenId: string): number {
    return _.find(tokens, {id: tokenId}).decimals;
  },
});
