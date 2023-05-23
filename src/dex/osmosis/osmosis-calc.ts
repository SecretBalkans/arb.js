import { OptimizedRoutes } from "../../lib/@osmosis/packages/pools/src";
import { Pool } from "../../lib/@osmosis/packages/pools/src";
import incentivizedPoolIds from "./incentivizedPoolIds";
import bigInteger from "big-integer";
import {Int} from "@keplr-wallet/unit";
export default class OsmosisCalc {
  private readonly routers: Record<string, OptimizedRoutes> = {};
  constructor(private readonly pools: Pool[]) {
  }

  public static getPairKey(tokenInDenom: string, tokenOutDenom: string) {
    return [tokenInDenom, tokenOutDenom].sort().join('-');
  }

  public getPairRouter(tokenInDenom: string, tokenOutDenom: string) {
    const routerPairKey = OsmosisCalc.getPairKey(tokenInDenom, tokenOutDenom);
    if (!this.routers[routerPairKey]) {
      this.routers[routerPairKey] = new OptimizedRoutes(this.pools, incentivizedPoolIds, 'uosmo');
    }
    return this.routers[routerPairKey];
  }


  public calculateBestOsmosisSwapRoute({
                                                  tokenInDenom,
                                                  tokenInAmount,
                                                  tokenOutDenom,
                                                }: {
    tokenInDenom: string,
    tokenInAmount: bigInteger.BigInteger,
    tokenOutDenom: string
  }) {
    const int = tokenInAmount.toString();
    const router = this.getPairRouter(tokenInDenom, tokenOutDenom);
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
}
