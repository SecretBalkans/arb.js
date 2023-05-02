import { OptimizedRoutes } from '@osmosis-labs/pools';
import { allPools } from './osmosis-rest';
import BigNumber from 'bignumber.js';
import { Int } from '@keplr-wallet/unit';

export function calculateBestOsmosisSwapRoute({
                                                tokenInDenom,
                                                tokenInAmount,
                                                tokenOutDenom,
                                              }: {
  tokenInDenom: string,
  tokenInAmount: BigNumber,
  tokenOutDenom: string
}) {
  const router = new OptimizedRoutes(allPools, ['1', '2'], 'uosmo');

  const int = tokenInAmount.toString();
  const routes =router.getOptimizedRoutesByTokenIn(
    {
      denom: tokenInDenom,
      amount: new Int(int),
    },
    tokenOutDenom,
    3,
  );
  return routes.map(r => ({
    amount: r.amount,
    pools: r.pools,
    out: router.calculateTokenOutByTokenIn(routes).amount
  }))
}
