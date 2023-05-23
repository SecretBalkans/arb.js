
// TODO: fix this type to be debend on dexProtocolName
import {ShadeRouteSegmentInfo} from "../dex/shade/types";
import {DexProtocolName, SwapToken} from "../dex/types/dex-types";
import {OsmosisRouteSegmentInfo} from "../dex/osmosis/types";

export type RouteSegmentInfo =/*Osmosis*/ OsmosisRouteSegmentInfo | /*Shade*/ShadeRouteSegmentInfo

export type RouteSegment<T extends DexProtocolName> = T extends 'osmosis' ? OsmosisRouteSegmentInfo : ShadeRouteSegmentInfo;

// TODO: fix this type to be debend on dexProtocolName


export interface ArbPathJSON {
  id: string,
  dex1: DexProtocolName;
  dex0: DexProtocolName;
  amountIn: number;
  amountBridge: number;
  amountOut: number;
  bridge: any[];
  route0: RouteSegmentInfo[],
  route1: RouteSegmentInfo[];
  error1: string;
  error0: string;
  pair: [SwapToken, SwapToken]
}
