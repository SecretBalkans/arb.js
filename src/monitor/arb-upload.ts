import {
  ArbitrageMonitor,
  ArbPath,
  ArbPathJSON,
  RouteSegmentInfoWithAmounts
} from '../arbitrage/dexArbitrage';
import { DexPool } from '../dex/types/dex-types';
import * as https from 'http';
import * as http from 'http';
import config from '../config';
import _ from 'lodash';
import { fetchTimeout } from '../utils';

interface ArbV1Raw {
  amount_bridge: number,
  amount_in: number,
  amount_out: number
  bridge: any,
  dex_0: string,
  dex_1: string,
  id: string
  last_ts: Date,
  route_0: RouteSegmentInfoWithAmounts[],
  route_1: RouteSegmentInfoWithAmounts[],
  token_0: string,
  token_1: string
  ts: Date
}

interface ArbV1 {
  amountBridge: number,
  amountIn: number,
  amountOut: number
  bridge: any,
  dex0: string,
  dex1: string,
  id: string
  route0: RouteSegmentInfoWithAmounts[],
  route1: RouteSegmentInfoWithAmounts[],
  token0: string,
  token1: string
  lastTs: Date,
  ts: Date
}

function toRawArbV1(json: ArbV1): ArbV1Raw {
  return {
    amount_bridge: json.amountBridge,
    amount_in: json.amountIn,
    amount_out: json.amountOut,
    bridge: json.bridge || '',
    dex_0: json.dex0,
    dex_1: json.dex1,
    id: json.id,
    last_ts: json.lastTs,
    route_0: json.route0,
    route_1: json.route1,
    token_0: json.token0,
    token_1: json.token1,
    ts: json.ts,
  };
}

function parseRawArbV1(arb: ArbV1Raw): ArbV1 {
  return {
    amountBridge: arb.amount_bridge,
    amountIn: arb.amount_in,
    amountOut: arb.amount_out,
    bridge: arb.bridge,
    dex0: arb.dex_0,
    dex1: arb.dex_1,
    id: arb.id,
    lastTs: new Date(arb.last_ts),
    route0: arb.route_0,
    route1: arb.route_1,
    token0: arb.token_0,
    token1: arb.token_1,
    ts: new Date(arb.ts),
  };
}

export default class ArbMonitorUploader {
  private readonly persistedArbPaths: Record<string, ArbV1> = {};
  private readonly latestArbPaths: Record<string, ArbPathJSON> = {};
  ts: Date;

  constructor(private readonly arbMonitor: ArbitrageMonitor) {
    execute(`query getAllArbs {
      arb_v1 {
        amount_bridge
        amount_in
        amount_out
        bridge
        dex_0
        dex_1
        id
        last_ts
        route_0
        route_1
        token_0
        token_1
        ts
      }
    }
  `).then(all => {
      this.arbMonitor.subscribeArbs().subscribe({
        next: (arbPaths) => {
          this.nextTs();
          const ts = this.ts;
          const includedForUpload = {};
          const toUpload = arbPaths.reduce((res, ap) => {
            const json = ap.toJSON();
            this.latestArbPaths[json.id] = json;
            const persistedArbPath = this.persistedArbPaths[json.id];
            includedForUpload[json.id] = true;
            if (!persistedArbPath
              || json.amountIn !== persistedArbPath.amountIn
              || json.amountOut !== persistedArbPath.amountOut
              || json.amountBridge !== persistedArbPath.amountBridge
              || !_.isEqual(json.route0, persistedArbPath.route0)
              || !_.isEqual(json.route1, persistedArbPath.route1)
              || json.pair[0] !== persistedArbPath.token0
              || json.pair[1] !== persistedArbPath.token1) {
              // There is a change in the arb
              const arbV1 = this.arbPathToV1(ap);
              res.many.push(toRawArbV1(arbV1));
            } else {
              res.ts.push(json.id);
            }
            return res;
          }, {
            ts: [],
            many: [],
          } as {
            many: ArbV1Raw[],
            ts: string[]
          });
          Object.entries(this.persistedArbPaths).forEach(([id]) => {
            if (!includedForUpload[id]) {
              toUpload.ts.push(id)
            }
          });
          toUpload.ts.forEach(id => {
            this.persistedArbPaths[id].ts = ts;
          });
          this.updateManyArbTs(toUpload.ts, ts).then((res) => {
            console.log(res);
          }).catch(console.error.bind(console));

          this.uploadManyArbs(toUpload.many).then((res) => {
            console.log(`manyArbs`, { rows: res.rows, many: res.updateManyArbs.map(r => r.id) });
            res.updateManyArbs.forEach(d => {
              this.persistedArbPaths[d.id] = d.arb;
            });
          }).catch(console.error.bind(console));
        },
      });
      all.data.arb_v1.forEach(rawArb => {
        this.persistedArbPaths[rawArb.id] = parseRawArbV1(rawArb);
      });
    });
  }

  async uploadManyArbs(arbs: ArbV1Raw[]): Promise<{ rows: any, updateManyArbs: { id: string, arb: ArbV1 }[] }> {
    const result = await execute(`
  mutation upsertManyArbs ($objects: [arb_v1_insert_input!]!) {
    insert_arb_v1(objects: $objects,
      on_conflict: {
        constraint: arb_v1_pkey,
        update_columns: [
          amount_in, amount_bridge, amount_out,
          dex_0, dex_1,
          token_0, token_1,
          route_0, route_1,
          ts, last_ts
        ]
    })
    {
      affected_rows
    }
  }
  `, {
      objects: arbs,
    });

    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    return {
      rows: result.data.insert_arb_v1,
      updateManyArbs: arbs.map(arb => ({
        arb: parseRawArbV1(arb),
        id: arb.id,
      })),
    };
  }

  async uploadArbPath(arb: ArbV1): Promise<{ updateArb: { id: string, ts: string } }> {
    const result = await execute(`
mutation upsertArb($id: String! = "", $ts: timestamp! = "", $last_ts: timestamp! = "", $amount_bridge: float8 = "$amount_bridge", $amount_in: float8 = "", $amount_out: float8 = "", $dex_0: String = "", $bridge: jsonb = "", $dex_1: String = "", $route_1: jsonb = "", $route_0: jsonb = "", $token_0: String = "", $token_1: String = "") {
  insert_arb_v1_one(
    object: {
      amount_bridge: $amount_bridge,
      amount_in: $amount_in,
      amount_out: $amount_out,
      bridge: $bridge,
      dex_0: $dex_0,
      dex_1: $dex_1,
      id: $id,
      last_ts: $last_ts,
      route_0: $route_0,
      token_0: $token_0,
      route_1: $route_1,
      token_1: $token_1,
      ts: $ts
    },
    on_conflict: {
      constraint: arb_v1_pkey,
      update_columns: [
        amount_bridge,
        amount_in,
        amount_out,
        bridge,
        dex_0,
        dex_1,
        id,
        last_ts,
        route_0,
        token_0,
        route_1,
        token_1,
        ts
      ]
    }) {
      ts
      id
  }
}
`, toRawArbV1(arb) as {
      amount_bridge: any
      amount_in: any
      amount_out: any
      bridge: any
      dex_0: any
      dex_1: any
      id: any
      ts: any
      last_ts: any
      route_0: any
      token_0: any
      route_1: any
      token_1: any
    });
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    return {
      updateArb: result.data.insert_arb_v1_one,
    };
  }

  async updateManyArbTs(arbIds: string[], ts: Date): Promise<{ updateManyTs: any }> {
    const result = await execute(`
mutation updateManyArbTs($arbIds: [String!]! = "", $ts: timestamp! = "") {
  update_arb_v1_many(updates: {where: {id: {_in: $arbIds}}, _set: {ts: $ts}}) {
    affected_rows
  }
}
`, {
      arbIds,
      ts,
    });
    return {
      updateManyTs: result.data.update_arb_v1_many,
    };

  }

  arbPathToV1(ap: ArbPath<DexPool, DexPool, any>) {
    return {
      ...ap.toJSON(),
      token0: ap.pair[0],
      token1: ap.pair[1],
      ts: this.ts,
      lastTs: this.ts,
    };
  }

  private nextTs() {
    this.ts = new Date();
  }
}

const v1GraphqlUrl = config.secrets.monitor.gqlUrl;

let agent;
if (v1GraphqlUrl.startsWith('https')) {
  agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 20,
  });
} else {
  agent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 20,
  });
}
const hasuraPass = config.secrets.monitor.gqlPassword;

export const execute = async (operation, variables = {}) => {
  return await fetchTimeout(
    v1GraphqlUrl,
    {
      agent,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': hasuraPass,
      },
      body: JSON.stringify({
        query: operation,
        variables,
      }),
    },
  );
};
