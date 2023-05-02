import { fetchTimeout } from '../../utils';
import https from 'https';
import { Pool, StablePool, WeightedPool } from '@osmosis-labs/pools';

const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 5,
});
export let allPools: Pool[];
export async function getOsmoPools (): Promise<Pool[]> {
  const osmoReq = await fetchTimeout('https://osmosis.stakesystems.io/osmosis/gamm/v1beta1/pools?pagination.limit=1250', {
    agent,
    compress: true,
    'headers': {
      'accept': 'application/json, text/plain, */*',
    }
  });
  allPools = osmoReq.pools.map((poolRaw: any) => {
    if (poolRaw["@type"] === "/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool") {
      return new StablePool(poolRaw);
    } else {
      return new WeightedPool(poolRaw);
    }
  });
  return allPools;
}
