import {
  ArbitrageMonitor,
  ArbPath,
} from '../arbitrage/dexArbitrage';
import {DexProtocolName} from '../dex/types/dex-types';
import * as https from 'http';
import * as http from 'http';
import config from '../config';
import _ from 'lodash';
import {fetchTimeout} from '../utils';
import {ArbPathParsed} from '../arbitrage/types';
import {ArbV1, ArbV1Raw, parseRawArbV1Number, toRawArbV1} from './types';


export default class ArbMonitorUploader {
  private readonly persistedArbPaths: Record<string, ArbV1<number>> = {};
  private readonly latestArbPaths: Record<string, ArbPathParsed> = {};
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
        reverse_id
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
            console.log(`manyArbs`, {rows: res.rows, many: res.updateManyArbs.map(r => r.id)});
            res.updateManyArbs.forEach(d => {
              this.persistedArbPaths[d.id] = d.arb;
            });
          }).catch(console.error.bind(console));
        },
      });
      all.data.arb_v1.forEach(rawArb => {
        this.persistedArbPaths[rawArb.id] = parseRawArbV1Number(rawArb);
      });
    });
  }

  async uploadManyArbs(arbs: ArbV1Raw[]): Promise<{ rows: any, updateManyArbs: { id: string, arb: ArbV1<number> }[] }> {
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
          ts, last_ts, reverse_id
        ]
    })
    {
      affected_rows
    }
  }
  `, {
      objects: _.uniqBy(arbs, a => a.id),
    });

    if (result.errors) {
      throw new Error(JSON.stringify({ arbs: _.map(arbs, arb => [arb.id, arb.reverse_id]), error: _.pick(result.errors[0].extensions, ['code', 'internal.error.hint','path'])}))
    }
    return {
      rows: result.data.insert_arb_v1,
      updateManyArbs: arbs.map(arb => ({
        arb: parseRawArbV1Number(arb),
        id: arb.id,
      })),
    };
  }

  // noinspection JSUnusedGlobalSymbols -- NOT TESTED
  async uploadArbPath(arb: ArbV1<number>): Promise<{ updateArb: { id: string, ts: string } }> {
    throw new Error('Not tested');
    // noinspection UnreachableCodeJS
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
       reverse_id: $reverse_id
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
        ts,
        reverse_id
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
      token_1: any,
      reverse_id: any
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

  arbPathToV1(ap: ArbPath<DexProtocolName, DexProtocolName, any>): ArbV1<number> {
    return {
      ...ap.toJSON(),
      route0: ap.route0,
      route1: ap.route1,
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
