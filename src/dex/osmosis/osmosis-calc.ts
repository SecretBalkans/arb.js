import { Int } from '@keplr-wallet/unit';
import { CoinAmount } from '../types/dex-types';
import { router } from './osmosis-rest';
export function calculateBestOsmosisSwapRoute({
                                                tokenInDenom,
                                                tokenInAmount,
                                                tokenOutDenom,
                                              }: {
  tokenInDenom: string,
  tokenInAmount: CoinAmount,
  tokenOutDenom: string
}) {
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
