import { OptimizedRoutes } from '@osmosis-labs/pools';
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
}, pools) {
  const router = new OptimizedRoutes(pools, ['1', '2'], 'uosmo');

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
