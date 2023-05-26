import {StablePoolRaw, WeightedPoolRaw} from "../../lib/@osmosis/packages/pools/src";

export type DenomInfo = {
  decimals: number,
  denom: string,
  symbol: string
}

export type OsmosisRoute = {
  t0: DenomInfo,
  t1: DenomInfo,
  raws: OsmosisPoolRaw[]
};

export type OsmosisPoolRaw = WeightedPoolRaw | StablePoolRaw

