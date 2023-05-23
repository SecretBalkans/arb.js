import BigNumber from "bignumber.js";
import {DexProtocolName, SwapToken, SwapTokenMap} from "../types/dex-types";
import {RouteSegment} from "../../arbitrage/types";

import {convertCoinFromUDenomV2} from "../../utils";
import OsmosisCalc from "../osmosis/osmosis-calc";
import {getTokenDenom} from "../osmosis/tokens";
import bigInteger from "big-integer";
import ShadeCalc from "../shade/shade-calc";
import _ from "lodash";

export default function calculateTokenSwap<T extends DexProtocolName>(
  dex: T,
  swapTokenSent: SwapToken,
  swapTokenReceived: SwapToken,
  route: RouteSegment<T>[],
  amount: BigNumber): BigNumber {
  switch (dex) {
    case "osmosis":
      const osmosisRoute = route as RouteSegment<'osmosis'>[];
      const calc = new OsmosisCalc(osmosisRoute.map(r => r.raw));
      const {denom: tokenInDenomOsmo, decimals: tokenInOsmoDecimals} = getTokenDenom(SwapTokenMap[swapTokenSent]);
      const {denom: tokenOutDenomOsmo, decimals: tokenOutOsmoDecimals} = getTokenDenom(SwapTokenMap[swapTokenReceived]);

      const tokenInAmount = bigInteger(amount.multipliedBy(10 ** tokenInOsmoDecimals).toFixed(0));

      const [osmo] = calc.calculateBestOsmosisSwapRoute({
        tokenInAmount,
        tokenOutDenom: tokenOutDenomOsmo,
        tokenInDenom: tokenInDenomOsmo
      });

      return convertCoinFromUDenomV2(osmo?.out?.toString(), tokenOutOsmoDecimals);
    case "shade":
      const shadeRoute = route as RouteSegment<'shade'>[];
      const shadePairIds = _.map(shadeRoute, r => r.raw.id);
      const shadeCalc = new ShadeCalc(_.zipObject(shadePairIds, _.map(shadeRoute, r => r.raw)))
      const startToken = swapTokenSent === shadeRoute[0].t0.symbol ? shadeRoute[0].t0 : shadeRoute[0].t1;
      const result = shadeCalc.calculatePathOutcome({
        path: shadePairIds,
        startingTokenAmount: amount.multipliedBy(10 ** startToken.decimals),
        startingTokenId: startToken.id
      })
      const lastShadeRouteElement = shadeRoute[shadeRoute.length - 1]; // shadeRoute are note necessarily sorted
      const endToken = swapTokenReceived === lastShadeRouteElement.t0.symbol ? lastShadeRouteElement.t0 : lastShadeRouteElement.t1;
      return convertCoinFromUDenomV2(result.quoteOutputAmount, endToken.decimals);
    default:
      throw new Error(`Unsupported dex: ${dex} to calculate token swap ${amount.toString()} ${swapTokenSent} -> x ${swapTokenReceived}`)
  }
}
