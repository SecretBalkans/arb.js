import { fetchTimeout } from '../../utils';
import https from 'https';
import {
  OptimizedRoutes,
  Pool,
  StablePool,
  StablePoolRaw,
  WeightedPool,
  WeightedPoolRaw
} from '../../lib/@osmosis/packages/pools/src';
import _ from 'lodash';
import { PoolId } from '../types/dex-types';
import incentivizedPoolIds from './incentivizedPoolIds';
import OsmosisCalc from "./osmosis-calc";

// tslint:disable-next-line:one-variable-per-declaration
let poolsLiquidity, shouldRefreshPoolsLiquidity = true;

async function getPoolsLiquidity() {
  if (shouldRefreshPoolsLiquidity) {
    shouldRefreshPoolsLiquidity = false;
    setTimeout(() => shouldRefreshPoolsLiquidity = true, 15 * 60 * 1000);
    poolsLiquidity = (await fetchTimeout(`https://api-osmosis.imperator.co/stream/pool/v1/all?min_liquidity=1000&order_key=liquidity&order_by=desc&offset=0&limit=${500}`)).pools;
  }
  return poolsLiquidity;
}

let allPools: Pool[];

export async function getOsmoPools(url = 'https://rest-osmosis.ecostake.com', timeout = 10000): Promise<Pool[]> {
  const osmoReq = await fetchTimeout(`${url}/osmosis/gamm/v1beta1/pools?pagination.limit=1250`, {
    compress: true,
    'headers': {
      'accept': 'application/json, text/plain, */*',
    },
  }, timeout);
  const pl = await getPoolsLiquidity();
  allPools = osmoReq.pools
    .filter(poolRaw => !poolRaw.pool_assets?.some(p => p.token?.denom?.startsWith('gamm')))
    .filter(poolRaw => !!_.find(pl, { pool_id: +poolRaw.id }))
    .map((poolRaw: any) => {
      if (poolRaw['@type'] === '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool') {
        return new StablePool(poolRaw);
      } else {
        return new WeightedPool(poolRaw);
      }
    });
  return allPools;
}
