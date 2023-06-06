import BigNumber from "bignumber.js";
import {
  DexProtocolName,
  Route,
  isDexProtocolName,
  isSwapToken,
  SwapToken,
  SerializedRoute
} from "../dex/types/dex-types";
import _ from "lodash";
import {StablePoolRaw, WeightedPoolRaw} from "../lib/@osmosis/packages/pools/src";
import {
  ShadeRoutePoolEssential,
  ShadeTokenEssential
} from "../dex/shade/types";
import {parseRawPool, toRawShadePool} from "../dex/shade/shade-api-utils";
import {DenomInfo, OsmosisRoute} from "../dex/osmosis/types";
import {TokenPairInfoRaw} from "../dex/shade/shade-api-utils";

export interface ArbV1Raw {
  amount_bridge: number,
  amount_in: number,
  amount_out: number
  bridge: any,
  dex_0: string,
  dex_1: string,
  id: string
  reverse_id: string;
  last_ts: Date,
  route_0: SerializedRoute<DexProtocolName>,
  route_1: SerializedRoute<DexProtocolName>,
  token_0: string,
  token_1: string
  ts: Date
  height_1: number;
  height_0: number;
}

export interface ArbV1<T extends number | BigNumber> {
  amountBridge: T;
  amountIn: T;
  amountOut: T;
  bridge: any;
  dex0: DexProtocolName;
  dex1: DexProtocolName;
  id: string;
  reverseId: string;
  route0: Route<DexProtocolName>;
  route1: Route<DexProtocolName>;
  token0: SwapToken;
  token1: SwapToken;
  lastTs: Date;
  ts: Date;
  height0: number;
  height1: number;
}

export function isShadePathRaw(poolRaw: WeightedPoolRaw | StablePoolRaw | ShadeRoutePoolEssential | TokenPairInfoRaw): poolRaw is ShadeRoutePoolEssential {
  return !poolRaw['@type'];
}

export function isShadeTokenEssential(denomInfo: DenomInfo | ShadeTokenEssential): denomInfo is ShadeTokenEssential {
  return !(denomInfo as any).denom;
}

function validateDenomInfo(t0: DenomInfo | ShadeTokenEssential): DenomInfo {
  if(!isShadeTokenEssential(t0) && !!(t0 as DenomInfo).denom) {
    return t0 as DenomInfo
  }
  throw new Error(`Expected osmosis DenomInfo type. Actual: ${JSON.stringify(t0)}.`);
}

function validateOsmoRaw(raw: WeightedPoolRaw | StablePoolRaw | ShadeRoutePoolEssential | TokenPairInfoRaw): WeightedPoolRaw | StablePoolRaw {
  if(!isShadePathRaw(raw) && !isShadeTokenInfo(raw)) {
    return raw;
  }
  throw new Error(`Expected WeightedPoolRaw | StablePoolRaw. Actual: ${JSON.stringify(raw)}.`);
}

function isOsmosisRoute(route: Route<DexProtocolName>): route is Route<'osmosis'> {
  return !Array.isArray(route as OsmosisRoute);
}

function isOsmosisSerializedRoute(route: SerializedRoute<DexProtocolName>): route is OsmosisRoute {
  return !Array.isArray(route as OsmosisRoute);
}

export function serializeRoute<T extends DexProtocolName>(route: Route<T>): SerializedRoute<DexProtocolName> {
  if (isOsmosisRoute(route)) {
    return route
  } else {
    return route.map(path => {
      return {
        t0: path.t0,
        t1: path.t1,
        raw: toRawShadePool(path.raw, path.t0.decimals, path.t1.decimals),
      }
    })
  }
}


function isShadeTokenInfo(raw: WeightedPoolRaw | StablePoolRaw | TokenPairInfoRaw): raw is TokenPairInfoRaw {
  return !!(raw as TokenPairInfoRaw).contract;
}

export function parseRoute<T extends DexProtocolName>(route: SerializedRoute<T>): Route<DexProtocolName> {
  if (isOsmosisSerializedRoute(route)) {
    return route;
  } else {
    return _.map(route, path => {
      return {
        t0: path.t0,
        t1: path.t1,
        raw: parseRawPool(path.raw, path.t0.decimals, path.t1.decimals),
      }
    });
  }
}

export function toRawArbV1(json: ArbV1<number>): ArbV1Raw {
  return {
    amount_bridge: json.amountBridge,
    amount_in: json.amountIn,
    amount_out: json.amountOut,
    bridge: json.bridge || '',
    dex_0: json.dex0,
    dex_1: json.dex1,
    id: json.id,
    reverse_id: json.reverseId,
    last_ts: json.lastTs,
    route_0: serializeRoute(json.route0),
    route_1: serializeRoute(json.route1),
    token_0: json.token0,
    token_1: json.token1,
    height_0: json.height0,
    height_1: json.height1,
    ts: json.ts,
  };
}

function validateDexProtocol(str: string): DexProtocolName {
  if (isDexProtocolName(str)) {
    return str;
  } else {
    throw new Error(`Invalid dex protocol name ${str} from gql`);
  }
}

function validateSwapToken(token: string): SwapToken {
  if (isSwapToken(token)) {
    return token;
  } else {
    throw new Error(`Invalid token name ${token} from gql`);
  }
}

export function parseRawArbV1Number(arb: ArbV1Raw): ArbV1<number> {
  return {
    amountBridge: arb.amount_bridge,
    amountIn: arb.amount_in,
    amountOut: arb.amount_out,
    bridge: arb.bridge,
    dex0: validateDexProtocol(arb.dex_0),
    dex1: validateDexProtocol(arb.dex_1),
    id: arb.id,
    reverseId: arb.reverse_id,
    lastTs: new Date(arb.last_ts),
    route0: parseRoute(arb.route_0),
    route1: parseRoute(arb.route_1),
    token0: validateSwapToken(arb.token_0),
    token1: validateSwapToken(arb.token_1),
    ts: new Date(arb.ts),
    height0: arb.height_0,
    height1: arb.height_1,
  };
}

// noinspection JSUnusedGlobalSymbols - use by dexSDK
export function parseRawArbV1BigNumber(arb: ArbV1Raw): ArbV1<BigNumber> {
  return {
    ...parseRawArbV1Number(arb),
    amountBridge: BigNumber(arb.amount_bridge),
    amountIn: BigNumber(arb.amount_in),
    amountOut: BigNumber(arb.amount_out),
  };
}
