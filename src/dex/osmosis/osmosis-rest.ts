import { fetchTimeout } from '../../utils';
import https from 'https';
import { OptimizedRoutes, Pool, StablePool, WeightedPool } from '../../lib/@osmosis/packages/pools/src';
import _ from 'lodash';
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
export let router;
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
  router = router || new OptimizedRoutes(allPools, incentivizedPoolIds, 'uosmo');
  return allPools;
}
