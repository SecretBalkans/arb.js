import {
  DexProtocol,
  DexProtocolName,
  IPool,
  PoolId, reversePair,
  SwapToken, SwapTokenMap, Token,
} from '../dex/types/swap-types';

import _ from 'lodash';
import { combineLatest, Observable, ObservedValueOf } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import BigNumber from 'bignumber.js';

export interface ArbPath {
  pair: ArbPair,
  info: any
}

type ArbPair = [SwapToken, SwapToken];

export class ArbitrageMonitor {

  private readonly pairs: ArbPair[];

  constructor(private readonly store: DexStore, pairs: ArbPair[]) {
    this.pairs = pairs;
  }

  subscribeArbs (): Observable<ArbPath[]> {
    return this.store.subscribeDexProtocolsCombined().pipe(
      map(dexProtocols => {
        const dex0 = dexProtocols[0].dex;
        const dexName0 = dex0.name;
        const dex1 = dexProtocols[1].dex;
        const dexName1 = dex1.name;
        const baseAmount = BigNumber(1);
        return _.map(this.pairs, pair => {
          function calcDexArbOut(amount: BigNumber, pair: [SwapToken, SwapToken], dexProtocol0: DexProtocol, dexProtocol1: DexProtocol): BigNumber {
            const swapPair: [Token, Token] = [SwapTokenMap[pair[0]],SwapTokenMap[pair[1]]];
            const amountIn = dexProtocol0.calcSwap(baseAmount, swapPair).amountOut;
            return dexProtocol1.calcSwap(amountIn, reversePair(swapPair)).amountOut
          }
          return ({
            pair,
            info: {
              [`${dexName0}-${dexName1}`]: calcDexArbOut(baseAmount, pair, dex0, dex1).toString(),
              [`${dexName1}-${dexName0}`]: calcDexArbOut(baseAmount, pair, dex1, dex0).toString(),
              [`-(${dexName0}-${dexName1})`]: calcDexArbOut(baseAmount, reversePair(pair), dex0, dex1).toString(),
              [`-(${dexName1}-${dexName0})`]: calcDexArbOut(baseAmount, reversePair(pair), dex1, dex0).toString(),
            },
          });
        })
      })
    );
  }
}

class PersistedPoolData {
  constructor({ pool, height }) {
    this.update({ pool, height });
  }

  pool: IPool | null;
  height: number | null;

  update({ pool, height }) {
    this.pool = pool;
    this.height = height;
  }
}

export class DexStore {
  protected readonly dexSubscriptions: Partial<Record<DexProtocolName, Observable<{ dex: DexProtocol, pools: IPool[], height: number }>>> = {};

  // We keep the latest dex heights to avoid emitting more than one event for each dex block update
  private readonly heights: Partial<Record<DexProtocolName, number>> = {}

  constructor(private readonly dexProtocols: DexProtocol[]) {
    dexProtocols.forEach(this.attachLivePoolStore.bind(this));
  }

  private readonly dexPools: Partial<Record<DexProtocolName, Record<PoolId, PersistedPoolData>>> = {};
  subscribeDexProtocolsCombined(): Observable<ObservedValueOf<Observable<{ dex: DexProtocol, pools: IPool[]; height: number }>>[]> {
    return combineLatest(Object.values(this.dexSubscriptions))/*.pipe(startWith(Object.keys(this.dexPools).map((d) => {
      return {
        dex: d as DexProtocol,
        pools: _.values(this.dexPools[d]),
        height: this.heights[d]
      }
    })))*/;
  }

  public getDexPool(dex: DexProtocolName, poolId: PoolId): PersistedPoolData | null {
    const dexPoolKey = this.getDexPoolKey(dex, poolId);
    return _.get(this.dexPools, dexPoolKey) || null;
  }

  public getAllDexPools(dex: DexProtocolName): PersistedPoolData[] {
    return Object.values(this.dexPools[dex]);
  }

  private ensureDexPool(dex: DexProtocolName, poolId: PoolId): PersistedPoolData {
    const dexPoolKey = this.getDexPoolKey(dex, poolId);
    return _.get(this.dexPools, dexPoolKey) ||
      _.set(this.dexPools, dexPoolKey, new PersistedPoolData({ height: null, pool: null }));
  }

  attachLivePoolStore(dex: DexProtocol) {
    const subscription = dex.subscribeToPoolsUpdate().pipe(filter(({ height }) => {
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
      dex
    })));
    this.dexSubscriptions[dex.name] = subscription;
    this.heights[dex.name] = -1;
    return subscription;
  }

  private getDexPoolKey(dex: DexProtocolName, poolId: PoolId): string {
    return `${dex}.${poolId}`;
  }

  private updateDexPool(dex: DexProtocolName, poolId: PoolId, newPoolData: IPool, height: number): boolean {
    const { pool: persistedDexPoolInfo, height: persistedHeight } = this.ensureDexPool(dex, poolId);
    if (!persistedDexPoolInfo || ((persistedDexPoolInfo.token0Amount.toString() !== newPoolData.token0Amount.toString() || persistedDexPoolInfo.token1Amount.toString() !== newPoolData.token1Amount.toString()) && persistedHeight < height)) {
      this.ensureDexPool(dex, poolId).update(({ pool: newPoolData, height }));
      return true;
    } else {
      return false;
    }
  }
}
