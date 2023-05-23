import { Pool } from "../../lib/@osmosis/packages/pools/src";

export type DenomInfo = {
  decimals: number,
  denom: string,
  symbol: string
}

export type OsmosisRouteSegmentInfo = {
  t0: DenomInfo,
  t1: DenomInfo,
  raw: Pool,
};
