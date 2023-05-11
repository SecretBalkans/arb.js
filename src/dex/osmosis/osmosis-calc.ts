import { Int } from '@keplr-wallet/unit';
import { getPairRouter } from './osmosis-rest';
import bigInteger from 'big-integer';

export function calculateBestOsmosisSwapRoute({
                                                tokenInDenom,
                                                tokenInAmount,
                                                tokenOutDenom,
                                              }: {
  tokenInDenom: string,
  tokenInAmount: bigInteger.BigInteger,
  tokenOutDenom: string
}) {
  const int = tokenInAmount.toString();

  const router = getPairRouter(tokenInDenom, tokenOutDenom);
  const routes = router.getOptimizedRoutesByTokenIn(
    {
      denom: tokenInDenom,
      amount: new Int(int),
    },
    tokenOutDenom,
    4,
    3,
  );
  return routes.map(r => ({
    amount: r.amount,
    pools: r.pools,
    out: router.calculateTokenOutByTokenIn(routes).amount,
  }));
}
