import {
  ArbCalculator,
  ArbitrageMonitorMaster, ArbPairFullUpdate, ArbPairUpdateLight,
  ArbPath, DexHeightSubscription, DexProtocolsUpdateFull,
} from '../arbitrage/dexArbitrage';
import {DexProtocolName} from '../dex/types/dex-types';
import * as https from 'http';
import * as http from 'http';
import config from '../config';
import _ from 'lodash';
import {fetchTimeout, Logger} from '../utils';
import {ArbPathParsed} from '../arbitrage/types';
import {ArbV1, ArbV1Raw, parseRawArbV1Number, toRawArbV1} from './types';
import {Observable} from "rxjs";
import {Prices} from "../prices/prices";
import cluster from "cluster";


export type ArbCalculatorObs = {
  full?: Observable<ArbPairFullUpdate>
  light?: {
    pairs: Observable<ArbPairUpdateLight>,
    dexUpdates: Observable<DexProtocolsUpdateFull>
  }
};
export default class ArbMonitorUploader {
  private readonly persistedArbPaths: Record<string, ArbV1<number>> = {};
  private readonly latestArbPaths: Record<string, ArbPathParsed> = {};
  ts: Date;
  private readonly logger: Logger;

  constructor(private readonly subscribes: {
    arbs: {
      obs: ArbCalculatorObs,
      calculator: ArbCalculator,
    },
    heightsObs?: Observable<DexHeightSubscription>,
    pricesObs?: Observable<Prices>
  }, private readonly maxBufferLength: number) {
    this.logger = new Logger(`ArbUpload#${cluster.worker?.id || 'Master'}`);
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
        height_0
        height_1
      }
    }
  `).then(all => {
      this.subscribes.arbs.calculator.enableCalculation(
        this.subscribes.arbs.obs
      ).subscribe({
        next: (arbPath) => {
          this.nextTs();
          const json = arbPath.toJSON();
          this.latestArbPaths[json.id] = json;
          const persistedArbPath = this.persistedArbPaths[json.id];
          if (!persistedArbPath
            || json.amountIn !== persistedArbPath.amountIn
            || json.amountOut !== persistedArbPath.amountOut
            || json.amountBridge !== persistedArbPath.amountBridge
            || !_.isEqual(json.route0, persistedArbPath.route0)
            || !_.isEqual(json.route1, persistedArbPath.route1)) {
            // There is a change in the arb
            const arbV1 = this.arbPathToV1(arbPath);
            setImmediate(()=> {
              this.uploadManyArbs([toRawArbV1(arbV1)]).then((res) => {
                this.persistedArbPaths[arbV1.id] = arbV1;
                if (res) {
                  this.logger.log('Updated', res.updateManyArbs);
                }
              }).catch(this.logger.error.bind(this.logger));
            })
          } else {
            this.updateManyArbTs([arbPath.id], this.ts).then((res) => {
              this.logger.log('TS', arbPath.id);
            }).catch(this.logger.error.bind(this.logger));
          }
        },
      });
      all.data.arb_v1.forEach(rawArb => {
        this.persistedArbPaths[rawArb.id] = parseRawArbV1Number(rawArb);
      });
    });
    subscribes.pricesObs?.subscribe(prices => {
      this.uploadPrices(prices).then(result => {
        const gqlError = this.getGQLErrors(result);
        if (gqlError) {
          throw new Error(JSON.stringify({
            type: 'gqlPrices',
            error: gqlError
          }))
        }
      }).catch(this.logger.error.bind(this.logger))
    })
    subscribes.heightsObs?.subscribe((data) => {
      this.uploadHeights([{dex: data.dex.name, height: data.height}]).then(result => {
        const gqlError = this.getGQLErrors(result);
        if (gqlError) {
          throw new Error(JSON.stringify({
            type: 'gqlHeights',
            error: gqlError
          }))
        }
        console.log(data.dex.name, data.height);
      }).catch(this.logger.error.bind(this.logger))
    })
  }

  buffer: ArbV1Raw[] = [];

  async uploadManyArbs(arbs: ArbV1Raw[]): Promise<{ rows: any, updateManyArbs: number}> {
    this.buffer.push(...arbs);
    if (this.buffer.length >= this.maxBufferLength) {
      const arbV1Raws = this.buffer;
      this.buffer = [];
      const result = await execute(
        `
  mutation upsertManyArbs ($objects: [arb_v1_insert_input!]!) {
    insert_arb_v1(objects: $objects,
      on_conflict: {
        constraint: arb_v1_pkey,
        update_columns: [
          amount_in, amount_bridge, amount_out,
          dex_0, dex_1,
          token_0, token_1,
          route_0, route_1,
          ts, last_ts, reverse_id,height_0,height_1
        ]
    })
    {
      affected_rows
    }
  }
  `, {
          objects: _.uniqBy(arbV1Raws, a => a.id),
        });
      const gqlErrors = this.getGQLErrors(result);
      if (gqlErrors) {
        throw new Error(JSON.stringify({
          arbs: _.map(arbs, arb => [arb.id, arb.reverse_id]),
          error: gqlErrors
        }))
      }
      return {
        rows: result.data.insert_arb_v1,
        updateManyArbs: result.data.insert_arb_v1.affected_rows
      };
    }
  }

  private getGQLErrors(result) {
    if (result.errors) {
      return {
        ..._.pick(result.errors[0].extensions, ['code', 'internal.error.hint', 'path']),
        message: result.errors[0].message.sub(0, 100)
      };
    }
  }

// noinspection JSUnusedGlobalSymbols -- NOT TESTED
  async uploadArbPath(arb: ArbV1<number>): Promise<{ updateArb: { id: string, ts: string } }> {
    throw new Error('Not tested');
    // noinspection UnreachableCodeJS
    const result = await execute(`
mutation upsertArb($id: String! = "", $ts: timestamp! = "", $last_ts: timestamp! = "", $amount_bridge: float8 = "$amount_bridge", $amount_in: float8 = "", $amount_out: float8 = "", $dex_0: String = "", $bridge: jsonb = "", $dex_1: String = "", $route_1: jsonb = "", $route_0: jsonb = "", $token_0: String = "", $token_1: String = "", $height_0: Int, $height_1: Int) {
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
      height_0: $height_0
      height_1: $height_1
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
        reverse_id,
        height_0
        height_1
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
      height_0: any,
      height_1: any
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

  private async uploadHeights(data: { dex: string, height: number }[]) {
    return execute(`
mutation updateHeights($objects: [heights_insert_input!]! = {}) {
  insert_heights(objects: $objects, on_conflict: {constraint: heights_pkey, update_columns: height}) {
    affected_rows
  }
}
`, {
      objects: data
    })
  }

  private async uploadPrices(prices: Prices) {
    return execute(`
mutation updatePrices($object: prices_insert_input = {}) {
  insert_prices_one(object: $object, on_conflict: {constraint: prices_pkey, update_columns: prices}) {
    prices
    updated_at
    id
    created_at
  }
}
    `, {
      object: {
        id: 1,
        prices
      }
    })
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
