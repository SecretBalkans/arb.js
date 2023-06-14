/* tslint:disable:max-classes-per-file one-variable-per-declaration */
import {
  Amount,
  DexPool,
  DexProtocolName,
  IPool,
  Route,
  PoolId, PoolInfo,
  reversePair,
  SwapToken,
  SwapTokenMap,
  Token,
} from '../dex/types/dex-types';

import _ from 'lodash';
import {combineLatest, merge, Observable, ObservedValueOf, Subject} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {Logger} from '../utils';
import BigNumber from 'bignumber.js';
import {ArbPathParsed} from "./types";
import {serializeRoute} from '../monitor/types';
import {DexProtocol} from "../dex/types/dex-protocol";
import Aigle from "aigle";
import {ShadePair} from "../dex/shade/shade-api-utils";
import {OsmosisPoolRaw} from "../dex/osmosis/types";
import {isStablePool} from "../dex/osmosis/osmosis-calc";
import {StablePool, WeightedPool} from "../lib/@osmosis/packages/pools/src";
import {ArbCalculatorObs} from "../monitor/arb-upload";

const logger = new Logger('ArbitrageInternal');

export class ArbPath<T extends DexProtocolName, K extends DexProtocolName, B> {
  pair: ArbPair;
  dex0: DexProtocol<T>;
  dex1: DexProtocol<K>;
  route0?: Route<T>;
  route1?: Route<K>;
  bridge?: B[];
  amountIn?: Amount;
  amountBridge?: Amount;
  amountOut?: Amount;
  error0?: Error;
  error1?: Error;
  height0: number;
  height1: number;

  constructor({
                pair,
                dex0,
                dex1,
                route0,
                route1,
                bridge,
                amountIn,
                amountBridge,
                amountOut,
                error0,
                error1,
                height0,
                height1,
              }: {
                pair: ArbPair,
                dex0: DexProtocol<T>,
                dex1: DexProtocol<K>,
                route0?: Route<T>,
                route1?: Route<K>,
                bridge?: B[],
                amountIn?: Amount,
                amountBridge?: Amount,
                amountOut?: Amount,
                error0?: Error,
                error1?: Error,
                height0: number,
                height1: number,
              },
  ) {
    this.pair = pair;
    this.dex0 = dex0;
    this.dex1 = dex1;
    this.route0 = route0;
    this.route1 = route1;
    this.bridge = bridge;
    this.amountIn = amountIn;
    this.amountBridge = amountBridge;
    this.amountOut = amountOut;
    this.error0 = error0;
    this.error1 = error1;
    this.height0 = height0;
    this.height1 = height1;
  }

  get winPercentage(): BigNumber {
    return this.amountOut?.minus(this.amountIn)?.dividedBy(this.amountIn) || BigNumber(0);
  }

  toString() {
    if (this.error0) {
      logger.debugOnce(this.dex0.name, this.error0);
    }
    if (this.error1) {
      logger.debugOnce(this.dex1.name, this.error1);
    }
    return this.amountIn ? `(${this.winPercentage?.multipliedBy(100)?.toFixed(2)}%) ${this.dex0.name}-${this.dex1.name} [${this.pair[0]}-${this.pair[1]}] ${this.amountIn?.toString()}->${this.amountBridge?.toString()} ${this.pair[1]}->${this.amountOut?.toString()}` : `(N/A) ${this.dex0.name}-${this.dex1.name} [${this.pair[0]}-${this.pair[1]}]`;
  }

  toJSON(): ArbPathParsed {
    return {
      id: this.id,
      reverseId: this.reverseId,
      pair: this.pair,
      dex0: this.dex0.name,
      dex1: this.dex1.name,
      route0: serializeRoute(this.route0),
      route1: serializeRoute(this.route1),
      bridge: this.bridge,
      amountIn: this.amountIn?.toNumber(),
      amountBridge: this.amountBridge?.toNumber(),
      amountOut: this.amountOut?.toNumber(),
      error0: this.error0?.message,
      error1: this.error1?.message,
      height0: this.height0,
      height1: this.height1,
    };
  }

  get id() {
    return ArbPath.getId({dex0: this.dex0.name, dex1: this.dex1.name, pair: this.pair});
  }

  get reverseId() {
    return ArbPath.getId({
      dex0: this.dex1.name,
      dex1: this.dex0.name,
      pair: [this.pair[1], this.pair[0]]
    });
  }

  static getId({pair, dex0, dex1}: { pair: ArbPair, dex0: DexProtocolName, dex1: DexProtocolName }) {
    return `${[dex0, dex1].join('-')}_${pair.slice().join('-')}`
  }
}

export type ArbPair = [SwapToken, SwapToken];
const OVERRIDES_DEFAULT_BASE_AMOUNTS = {
  WBTC: BigNumber(0.001),
  WETH: BigNumber(0.01)
}

export class ArbitrageMonitorMaster {
  public readonly pairs: ArbPair[];

  constructor(private readonly store: DexStore, pairs: ArbPair[]) {
    this.pairs = pairs;
  }

  public subscribeHeights(): Observable<DexHeightSubscription> {
    return this.store.subscribeDexHeights();
  }

  public subscribeArbs(): Subject<ArbPairFullUpdate> {
    let d0poolMap: Record<PoolId, true>;
    let d1poolMap: Record<PoolId, true>;
    const subject = new Subject<ArbPairFullUpdate>();
    this.store.subscribeDexProtocolsCombined().subscribe((dexProtocolUpdates => {
      const dex0 = dexProtocolUpdates[0].dex;
      const dex1 = dexProtocolUpdates[1].dex;
      const isInitial = !d0poolMap || !d1poolMap;
      if (!d0poolMap) {
        const poolsMap = dex0.getPoolsMap(this.pairs);
        d0poolMap = _.zipObject(poolsMap, _.times(poolsMap.length, _.constant(true))) as Record<PoolId, true>;
      }
      if (!d1poolMap) {
        const poolsMap = dex1.getPoolsMap(this.pairs);
        d1poolMap = _.zipObject(poolsMap, _.times(poolsMap.length, _.constant(true))) as Record<PoolId, true>;
      }
      const changedPairs = this.pairs.filter(pair => {
        return isInitial || _.find(dexProtocolUpdates[0].pools, pool =>
            d0poolMap[pool.poolId] && _.intersection([pool.token1Id, pool.token0Id], [SwapTokenMap[pair[0]], SwapTokenMap[pair[1]]]).length > 0)
          || _.find(dexProtocolUpdates[1].pools, pool =>
            d1poolMap[pool.poolId] && _.intersection([pool.token1Id, pool.token0Id], [SwapTokenMap[pair[0]], SwapTokenMap[pair[1]]]).length > 0);
      });
      changedPairs.forEach(arbPair => subject.next({
        pair: arbPair.join('-'),
        d: dexProtocolUpdates.map(up => ({
          dexName: up.dex.name,
          rawPools: up.dex.rawPools.map((rp) => {
            if (isOsmosisPoolInfo(rp)) {
              return rp.raw
            } else {
              return rp;
            }
          }),
          height: up.height,
        }))
      }));
      console.log('changed', changedPairs.length);
    }));
    return subject;
  }
}

class PersistedPoolData<T extends DexPool> {
  constructor({pool, height}) {
    this.update({pool, height});
  }

  pool: IPool<T> | null;
  height: number | null;

  update({pool, height}) {
    this.pool = pool;
    this.height = height;
  }
}

export class ArbCalculator {
  private readonly _DEFAULT_BASE_AMOUNT: Amount = BigNumber(50);

  constructor(private readonly dexProtocols: DexProtocol<DexProtocolName>[], private readonly pairs: ArbPair[]) {
  }

  private parseRawPool(rawPools: RawPoolInfo<DexProtocolName>[]): (StablePool | WeightedPool | ShadePair)[] {
    return rawPools.map(poolRaw => {
      if (isOsmosisPoolRaw(poolRaw)) {
        if (isStablePool(poolRaw)) {
          return new StablePool(poolRaw);
        } else {
          return new WeightedPool(poolRaw);
        }
      } else {
        return poolRaw;
      }
    })
  }

  public fullDexUpdate(d: DexProtocolsUpdateFull) {
    const rawPools0 = this.parseRawPool(d[0].rawPools);
    const rawPools1 = this.parseRawPool(d[1].rawPools);
    if (this.dexProtocols[0].name === d[0].dexName) {
      this.dexProtocols[0].updateRawPools(rawPools0);
      this.dexProtocols[1].updateRawPools(rawPools1);
    } else {
      this.dexProtocols[0].updateRawPools(rawPools1);
      this.dexProtocols[1].updateRawPools(rawPools0);
    }
  }

  public enableCalculation(obs: ArbCalculatorObs): Observable<ArbPath<DexProtocolName, DexProtocolName, any>> {
    const q: Record<string, DexProtocolUpdateLight> = {};
    obs.light?.pairs.pipe(filter(d => !!_.find(this.pairs, (p) => p.join('-') === d.pair))).subscribe((update) => {
      q[update.pair] = update.d;
    });
    obs.light?.dexUpdates.subscribe(this.fullDexUpdate.bind(this));
    obs.full?.pipe(filter(d => !!_.find(this.pairs, (p) => p.join('-') === d.pair))).subscribe((update) => {
      q[update.pair] = update.d.map(full => _.pick(full, ['dexName', 'height']));
      this.fullDexUpdate(update.d);
    });
    return new Observable<ArbPath<DexProtocolName, DexProtocolName, any>>((emitter) => {
      Aigle.doWhilst(async () => {
        await Aigle.mapSeries(this.pairs, async (pairToCalculate) => {
          const pairKey = pairToCalculate.join('-');
          const qData = q[pairKey];
          if (qData) {
            delete q[pairKey];
            const changedPair = pairToCalculate;
            const dex0 = _.find(this.dexProtocols, {name: qData[0].dexName});
            const dex1 = _.find(this.dexProtocols, {name: qData[1].dexName});
            const height0 = qData[0].height;
            const height1 = qData[1].height;
            const baseAmount = this.getCachedCapacity({pair: changedPair, dex0, dex1});
            const reverseChangedPair = reversePair(changedPair);
            const reverseBaseAmount = this.getCachedCapacity({pair: reverseChangedPair, dex0, dex1});
            const pathArgs = [
              [baseAmount, changedPair, dex0, dex1, height0, height1],
              [baseAmount, changedPair, dex1, dex0, height1, height0],
              [reverseBaseAmount, reverseChangedPair, dex0, dex1, height0, height1],
              [reverseBaseAmount, reverseChangedPair, dex1, dex0, height1, height0],
            ];
            await Aigle.forEach(pathArgs, async (args: [Amount, ArbPair, DexProtocol<DexProtocolName>, DexProtocol<DexProtocolName>, number, number]) => {
              const arbPath = this.calcDexArbOut(...args);
              if (arbPath.amountOut?.isGreaterThan(arbPath.amountIn)) {
                const capacityUntilBalance = this.calculateCapacityUntilBalance(arbPath);
                if (capacityUntilBalance) {
                  this.setCurrentCapacity(capacityUntilBalance);
                }
                emitter.next(capacityUntilBalance)
              } else {
                // Reset capacity of arb routes that are not winning anymore
                const defaultCapacity = this.calcDexArbOut(this.getDefaultBaseAmount(arbPath.pair[0]), arbPath.pair, arbPath.dex0, arbPath.dex1, height0, height1, arbPath);
                this.setCurrentCapacity(defaultCapacity);
                emitter.next(arbPath)
              }
              await new Promise(resolve => setImmediate(resolve));
            })
          }
        })
      }, async () => {
        return new Promise(resolve => setImmediate(() => resolve(true)));
      }).catch(err => {
        console.error(err);
        throw new Error('dev: Unexpected arb calculation error. Throwing hard')
      })
    })
  }

  private readonly capacityMap: Record<string, Amount> = {};

  private getCachedCapacity({
                              pair,
                              dex0,
                              dex1,
                            }: { pair: ArbPair, dex0: DexProtocol<DexProtocolName>, dex1: DexProtocol<DexProtocolName> }): Amount {
    return this.capacityMap[this.getCapacityKey({pair, dex0, dex1})] || this.getDefaultBaseAmount(pair[0]);
  }

  private getCapacityKey({
                           pair,
                           dex0,
                           dex1,
                         }: { pair: ArbPair, dex0: DexProtocol<DexProtocolName>, dex1: DexProtocol<DexProtocolName> }): string {
    return ArbPath.getId({
      dex0: dex0.name,
      dex1: dex1.name,
      pair
    });
  }

  private setCurrentCapacity(path: ArbPath<DexProtocolName, DexProtocolName, any>) {
    this.capacityMap[this.getCapacityKey(path)] = path.amountIn;
  }

  getDefaultBaseAmount(token: SwapToken) {
    return OVERRIDES_DEFAULT_BASE_AMOUNTS[token] || this._DEFAULT_BASE_AMOUNT;
  }

  calcDexArbOut<T extends DexProtocolName, K extends DexProtocolName, B extends any>(
    amount: Amount,
    pair: ArbPair,
    dexProtocol0: DexProtocol<T>,
    dexProtocol1: DexProtocol<K>,
    height0: number,
    height1: number,
    routesHints: Pick<ArbPath<T, K, B>, 'route0' | 'route1'> = null): ArbPath<T, K, B> {
    const swapPair: [Token, Token] = [SwapTokenMap[pair[0]], SwapTokenMap[pair[1]]];
    const {
      amountOut: interAmount,
      route: route0,
      internalSwapError: error0,
    } = dexProtocol0.calcSwap(amount, swapPair, routesHints?.route0);
    if (error0) {
      return new ArbPath<T, K, B>({
        error0,
        dex0: dexProtocol0,
        dex1: dexProtocol1,
        pair,
        height0,
        height1,
      });
    }
    const {
      amountOut,
      route: route1,
      internalSwapError: error1,
    } = dexProtocol1.calcSwap(interAmount, reversePair(swapPair), routesHints?.route1);
    return new ArbPath<T, K, B>({
      error0,
      error1,
      amountIn: amount,
      amountBridge: interAmount,
      amountOut,
      dex0: dexProtocol0,
      dex1: dexProtocol1,
      pair,
      route0,
      route1,
      height0,
      height1
    });
  }

  calculateCapacityUntilBalance<T extends DexProtocolName, K extends DexProtocolName, B extends any>(
    path: ArbPath<T, K, B>): ArbPath<T, K, B> | null {
    const epsilon = 0.5;
    let diff;
    let count = 0;
    let baseAmount = path.amountIn;
    let step = path.amountIn.isEqualTo(this.getDefaultBaseAmount(path.pair[0])) ? path.amountIn.multipliedBy(0.5) : path.amountOut.minus(path.amountIn).absoluteValue();
    let prevAmount = path.amountIn;
    const restCalcArgs = [path.pair, path.dex0, path.dex1, path.height0, path.height1, path];
    let previousOutcome = this.calcDexArbOut.apply(this, [baseAmount, ...restCalcArgs]).amountOut;

    let dir = 1;
    let bestOutcome: Amount, result: ArbPath<T, K, B>;
    do {
      baseAmount = baseAmount.plus(step.multipliedBy(dir));
      if (baseAmount.isLessThanOrEqualTo(epsilon)) {
        baseAmount = BigNumber(epsilon);
      }
      result = this.calcDexArbOut.apply(this, [baseAmount, ...restCalcArgs]);
      bestOutcome = result.amountOut;
      if (!bestOutcome?.toNumber() || !previousOutcome?.toNumber()) {
        return null;
      }
      if (bestOutcome.minus(baseAmount).isLessThan(previousOutcome.minus(prevAmount))) {
        dir *= -1;
        step = step.dividedBy(2);
      }
      diff = baseAmount.minus(prevAmount);
      prevAmount = baseAmount;
      previousOutcome = bestOutcome;
    } while (count++ < 1000 && diff.absoluteValue().isGreaterThan(epsilon));

    return result;
  }

}

type DexPoolsSubscription = { dex: DexProtocol<DexProtocolName>, pools: IPool<PoolInfo<DexProtocolName>>[], height: number };

export type DexHeightSubscription = { dex: DexProtocol<DexProtocolName>, height: number };
export type ArbPairFullUpdate = { pair: string, d: DexProtocolsUpdateFull };
export type ArbPairUpdateLight = { pair: string, d: DexProtocolUpdateLight };
export type DexProtocolUpdateLight = { dexName: DexProtocolName, height: number }[]
export type DexProtocolsUpdateFull = { rawPools: RawPoolInfo<DexProtocolName>[], dexName: DexProtocolName, height: number }[];

type DexProtocolsUpdate = { dex: DexProtocol<DexProtocolName>, pools: IPool<PoolInfo<DexProtocolName>>[]; height: number };
type RawPoolInfo<T extends DexProtocolName> = T extends 'osmosis' ? OsmosisPoolRaw : ShadePair;

function isOsmosisPoolRaw(rawPoolInfo: RawPoolInfo<DexProtocolName>): rawPoolInfo is OsmosisPoolRaw {
  return rawPoolInfo && !!(rawPoolInfo as OsmosisPoolRaw)["@type"];
}

function isOsmosisPoolInfo(poolInfo: PoolInfo<DexProtocolName>): poolInfo is PoolInfo<'osmosis'> {
  return !!(poolInfo as PoolInfo<'osmosis'>)?.raw;
}

export class DexStore {
  public readonly dexSubscriptions: Partial<Record<DexProtocolName, Observable<DexPoolsSubscription>>> = {};
  public readonly dexHeightSubscriptions: Partial<Record<DexProtocolName, Observable<DexHeightSubscription>>> = {};

  // We keep the latest dex heights to avoid emitting more than one event for each dex block update
  private readonly heights: Partial<Record<DexProtocolName, number>> = {};

  constructor(private readonly dexProtocols: DexProtocol<DexProtocolName>[]) {
    dexProtocols.forEach(this.attachLivePoolStore.bind(this));
    dexProtocols.forEach((dex) => {
      this.dexHeightSubscriptions[dex.name] = dex.subscribeToDexHeights().pipe(
        map(({height}) => {
          return {
            dex,
            height
          }
        }))
    })
  }

  private readonly dexPools: Partial<Record<DexProtocolName, Record<PoolId, PersistedPoolData<DexPool>>>> = {};

  subscribeDexProtocolsCombined(): Observable<ObservedValueOf<Observable<DexProtocolsUpdate>>[]> {
    return combineLatest(Object.values(this.dexSubscriptions))
  }

  subscribeDexHeights(): Observable<DexHeightSubscription> {
    return merge(...Object.values(this.dexHeightSubscriptions))
  }

  public getDexPool(dex: DexProtocolName, poolId: PoolId): PersistedPoolData<DexPool> | null {
    const dexPoolKey = this.getDexPoolKey(dex, poolId);
    return _.get(this.dexPools, dexPoolKey) || null;
  }

  public getAllDexPools(dex: DexProtocolName): PersistedPoolData<DexPool>[] {
    return Object.values(this.dexPools[dex]);
  }

  private ensureDexPool(dex: DexProtocolName, poolId: PoolId): PersistedPoolData<DexPool> {
    const dexPoolKey = this.getDexPoolKey(dex, poolId);
    return _.get(this.dexPools, dexPoolKey) ||
      _.set(this.dexPools, dexPoolKey, new PersistedPoolData({height: null, pool: null}));
  }

  attachLivePoolStore(dex: DexProtocol<DexProtocolName>): Observable<DexPoolsSubscription> {
    const subscription: Observable<{ dex: DexProtocol<DexProtocolName>; pools: any; height: any }> = dex.subscribeToPoolsUpdate().pipe(filter(({height}) => {
      let shouldEmit = false;
      // We update the latest heights for each dex subscription to avoid emitting more than one event for each dex block update

      if (height > this.heights[dex.name]) {
        shouldEmit = true;
        this.heights[dex.name] = height;
      }
      return shouldEmit;
    }), map(data => ({
      pools: data.pools.filter(p => this.updateDexPool(p.dex, p.poolId, p, data.height)),
      height: data.height,
      dex,
    })));
    this.dexSubscriptions[dex.name] = subscription;
    this.heights[dex.name] = -1;
    return subscription;
  }

  attachSerializedPoolSubscriptions(dexName: DexProtocolName, subscription: Observable<{ pools: IPool<PoolInfo<DexProtocolName>>[]; height: number }>) {
    subscription.pipe(filter(({height}) => {
      let shouldEmit = false;
      // We update the latest heights for each dex subscription to avoid emitting more than one event for each dex block update

      if (height > this.heights[dexName]) {
        shouldEmit = true;
        this.heights[dexName] = height;
      }
      return shouldEmit;
    }), map(data => ({
      pools: data.pools.filter(p => this.updateDexPool(p.dex, p.poolId, p, data.height)),
      height: data.height
    })))
  }

  private getDexPoolKey(dex: DexProtocolName, poolId: PoolId): string {
    return `${dex}.${poolId}`;
  }

  private updateDexPool(dex: DexProtocolName, poolId: PoolId, newPoolData: IPool<DexPool>, height: number): boolean {
    const {pool: persistedDexPoolInfo, height: persistedHeight} = this.ensureDexPool(dex, poolId);
    if (!persistedDexPoolInfo || ((persistedDexPoolInfo.token0Amount.toString() !== newPoolData.token0Amount.toString() || persistedDexPoolInfo.token1Amount.toString() !== newPoolData.token1Amount.toString()) && persistedHeight < height)) {
      this.ensureDexPool(dex, poolId).update(({pool: newPoolData, height}));
      return true;
    } else {
      return false;
    }
  }
}
