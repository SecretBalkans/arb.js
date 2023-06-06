import BigNumber from "bignumber.js";
import {DexProtocolName, Route, SwapToken} from "../dex/types/dex-types";

import {convertCoinFromUDenomV2} from "../utils";
import OsmosisCalc, {isStablePool} from "../dex/osmosis/osmosis-calc";
import bigInteger from "big-integer";
import ShadeCalc from "../dex/shade/shade-calc";
import _ from "lodash";
import {StablePool, WeightedPool} from "../lib/@osmosis/packages/pools/src";

export * from "../arbitrage/types";
export * from "../dex/types/dex-types";
export * from "../monitor/types";
export * from "../dex/shade/tokens";

export default function calculateTokenSwap<T extends DexProtocolName>(
  dex: T,
  swapTokenSent: SwapToken,
  swapTokenReceived: SwapToken,
  route: Route<T>,
  amount: BigNumber): BigNumber {
  switch (dex) {
    case "osmosis":
      const osmosisRoute = route as Route<'osmosis'>;
      const calc = new OsmosisCalc(osmosisRoute.raws.map(({pool: poolRaw}) => {
        if (isStablePool(poolRaw)) {
          return new StablePool(poolRaw);
        } else {
          return new WeightedPool(poolRaw);
        }
      }));
      const {
        denom: tokenInDenomOsmo,
        decimals: tokenInOsmoDecimals
      } = osmosisRoute.t0.symbol === swapTokenSent ? osmosisRoute.t0 : osmosisRoute.t1;
      const {
        denom: tokenOutDenomOsmo,
        decimals: tokenOutOsmoDecimals
      } = osmosisRoute.t0.symbol === swapTokenReceived ? osmosisRoute.t0 : osmosisRoute.t1;

      const tokenInAmount = bigInteger(amount.multipliedBy(10 ** tokenInOsmoDecimals).toFixed(0));

      const [osmo] = calc.calculateBestOsmosisSwapRoute({
        tokenInAmount,
        tokenOutDenom: tokenOutDenomOsmo,
        tokenInDenom: tokenInDenomOsmo
      });

      return convertCoinFromUDenomV2(osmo?.out?.toString(), tokenOutOsmoDecimals);
    case "shade":
      const shadeRoute = route as Route<'shade'>;
      const shadePairIds = _.map(shadeRoute, r => r.raw.id);
      const shadeCalc = new ShadeCalc(_.zipObject(shadePairIds, _.map(shadeRoute, r => r.raw)))
      const startToken = swapTokenSent === shadeRoute[0].t0.symbol ? shadeRoute[0].t0 : swapTokenSent === shadeRoute[0].t1.symbol ? shadeRoute[0].t1 : null;
      if (startToken === null) {
        throw new Error(`${swapTokenSent} doesn't match route entry path.`);
      }
      const lastShadeRouteElement = _.last(shadeRoute); // shadeRoute are note necessarily sorted
      const endToken = swapTokenReceived === lastShadeRouteElement.t0.symbol ? lastShadeRouteElement.t0 : lastShadeRouteElement.t1;
      try {
        const result = shadeCalc.calculatePathOutcome({
          path: shadePairIds,
          startingTokenAmount: amount.multipliedBy(10 ** startToken.decimals),
          startingTokenId: startToken.id
        })
        return convertCoinFromUDenomV2(result.quoteOutputAmount, endToken.decimals);
      } catch (e) {
        if (e.message.includes('parameter error')) {
          throw new Error(`${swapTokenSent}-${swapTokenReceived} doesn't match route.`)
        }
        throw e;
      }
    default:
      throw new Error(`Unsupported dex: ${dex} to calculate token swap ${amount.toString()} ${swapTokenSent} -> x ${swapTokenReceived}`)
  }
}
export {DexProtocol} from "../dex/types/dex-protocol";
