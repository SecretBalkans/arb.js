import { fetchTimeout } from '../../utils';
import https from 'https';
import { OptimizedRoutes, Pool, StablePool, WeightedPool } from '../../lib/@osmosis/packages/pools/src';
import _ from 'lodash';
import { PoolId } from '../types/dex-types';
import incentivizedPoolIds from './incentivizedPoolIds';

const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 5,
});
let poolsLiquidity, shouldRefreshPoolsLiquidity = true;

async function getPoolsLiquidity() {
  if (shouldRefreshPoolsLiquidity) {
    shouldRefreshPoolsLiquidity = false;
    setTimeout(() => shouldRefreshPoolsLiquidity = true, 15 * 60 * 1000);
    poolsLiquidity = (await fetchTimeout(`https://api-osmosis.imperator.co/stream/pool/v1/all?min_liquidity=1000&order_key=liquidity&order_by=desc&offset=0&limit=${500}`)).pools;
  }
  return poolsLiquidity;
}

export let allPools: Pool[];

export let routers: Record<string, OptimizedRoutes> = {};
let globalRouter: OptimizedRoutes;
let pairPools: Record<string, PoolId[]> = {};

export function getOsmoPairPools(tokenInDenom: string, tokenOutDenom: string): PoolId[] {
  const pairKey = getPairKey(tokenInDenom, tokenOutDenom);
  if (!pairPools[pairKey]) {
    globalRouter = globalRouter || new OptimizedRoutes(allPools, incentivizedPoolIds, 'uosmo');
    pairPools[pairKey] = [...globalRouter.getCandidateRoutes(tokenInDenom, tokenOutDenom, 4, 3),
      ...globalRouter.getCandidateRoutes(tokenOutDenom, tokenInDenom, 4, 3)]
      .flatMap(d => d.pools.map(pool => pool.id as PoolId));
  }
  return pairPools[pairKey];
}

export function getPairKey(tokenInDenom: string, tokenOutDenom: string) {
  return [tokenInDenom, tokenOutDenom].sort().join('-');
}


export function getPairRouter(tokenInDenom: string, tokenOutDenom: string) {
  const routerPairKey = getPairKey(tokenInDenom, tokenOutDenom);
  if (!routers[routerPairKey]) {
    const pairPools = getOsmoPairPools(tokenInDenom, tokenOutDenom);
    routers[routerPairKey] = new OptimizedRoutes(allPools.filter(p => pairPools.includes(p.id as PoolId)), incentivizedPoolIds, 'uosmo');
  }
  return routers[routerPairKey];
}
export async function getOsmoPools(): Promise<Pool[]> {
  const osmoReq = await fetchTimeout('https://osmosis.stakesystems.io/osmosis/gamm/v1beta1/pools?pagination.limit=1250', {
    agent,
    compress: true,
    'headers': {
      'accept': 'application/json, text/plain, */*',
    },
  }, 30000);
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
  routers = {};
  globalRouter = null;
  return allPools;
}
