import { Int } from '@keplr-wallet/unit';
import { OptimizedRoutes } from '../../lib/@osmosis/packages/pools/src';
import { CoinAmount } from '../types/swap-types';
import incentivizedPoolIds from './incentivizedPoolIds';
let router;
export function calculateBestOsmosisSwapRoute({
                                                tokenInDenom,
                                                tokenInAmount,
                                                tokenOutDenom,
                                              }: {
  tokenInDenom: string,
  tokenInAmount: CoinAmount,
  tokenOutDenom: string
}, pools) {
  router = router || new OptimizedRoutes(pools, incentivizedPoolIds, 'uosmo');

  const int = tokenInAmount.toString();
  const routes = router.getOptimizedRoutesByTokenIn(
    {
      denom: tokenInDenom,
      amount: new Int(int),
    },
    tokenOutDenom,
    4,
    3
  );
  return routes.map(r => ({
    amount: r.amount,
    pools: r.pools,
    out: router.calculateTokenOutByTokenIn(routes).amount
  }))
}
