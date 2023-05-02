import { DexProtocol, ILivePoolStore, IPool, PoolId } from '../dex/types/swap-types';

import _ from 'lodash';
import { combineLatest, ObservedValueOf, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

export class Arbitrage {
  props: any;

  constructor(props) {
    this.props = props;
  }

  print() {
    console.log('Arb', this.props);
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
  protected readonly dexSubscriptions: Partial<Record<DexProtocol, Observable<{ dex: DexProtocol, pools: IPool[], height: number }>>> = {};

  // We keep the latest dex heights to avoid emitting more than one event for each dex block update
  private readonly heights: Partial<Record<DexProtocol, number>> = {}

  constructor(private readonly dexLivePoolStores: ILivePoolStore[]) {
    dexLivePoolStores.forEach(this.attachLivePoolStore.bind(this));
  }

  private readonly dexPools: Partial<Record<DexProtocol, Record<PoolId, PersistedPoolData>>> = {};

  subscribeDexArbitrage(): Observable<ObservedValueOf<Observable<Arbitrage>>[]> {
    let arbitrage;
    return this.subscribeDexProtocolsCombined()
      .pipe(
        map((d: { pools: IPool[]; height: number }[]) => {
          if (!arbitrage) {

          } else {
            return [new Arbitrage([d[0].pools.length, d[1].pools.length])];
          }
        }),
      );
  }

  subscribeDexProtocolsCombined(): Observable<ObservedValueOf<Observable<{ dex: DexProtocol, pools: IPool[]; height: number }>>[]> {
    return combineLatest(Object.values(this.dexSubscriptions))/*.pipe(startWith(Object.keys(this.dexPools).map((d) => {
      return {
        dex: d as DexProtocol,
        pools: _.values(this.dexPools[d]),
        height: this.heights[d]
      }
    })))*/;
  }

  public getDexPool(dex: DexProtocol, poolId: PoolId): PersistedPoolData | null {
    const dexPoolKey = this.getDexPoolKey(dex, poolId);
    return _.get(this.dexPools, dexPoolKey) || null;
  }

  private ensureDexPool(dex: DexProtocol, poolId: PoolId): PersistedPoolData {
    const dexPoolKey = this.getDexPoolKey(dex, poolId);
    return _.get(this.dexPools, dexPoolKey) ||
      _.set(this.dexPools, dexPoolKey, new PersistedPoolData({ height: null, pool: null }));
  }

  attachLivePoolStore(dex: ILivePoolStore) {
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
      dex: dex.name
    })));
    this.dexSubscriptions[dex.name] = subscription;
    this.heights[dex.name] = -1;
    return subscription;
  }

  private getDexPoolKey(dex: DexProtocol, poolId: PoolId): string {
    return `${dex}.${poolId}`;
  }

  private updateDexPool(dex: DexProtocol, poolId: PoolId, newPoolData: IPool, height: number): boolean {
    const { pool: persistedDexPoolInfo, height: persistedHeight } = this.ensureDexPool(dex, poolId);
    if (!persistedDexPoolInfo || ((persistedDexPoolInfo.token0Amount.toString() !== newPoolData.token0Amount.toString() || persistedDexPoolInfo.token1Amount.toString() !== newPoolData.token1Amount.toString()) && persistedHeight < height)) {
      this.ensureDexPool(dex, poolId).update(({ pool: newPoolData, height }));
      return true;
    } else {
      return false;
    }
  }
}
