import {
  Amount,
  DexProtocol,
  DexProtocolName,
  ICanSwap,
  ILivePoolStore,
  IPool,
  IRoute,
  PoolId,
  Token,
} from '../types/swap-types';
import { calculateBestShadeSwapRoutes } from './shade-calc';
import BigNumber from 'bignumber.js';
import { getShadePairs } from './shade-rest';
import { convertCoinFromUDenomV2 } from '../../utils';
import { Observable } from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import { toTokenId, getShadeTokenBySymbol } from './tokens';

export * from './shade-calc'
export * from './shade-rest'

export default class ShadeSwap extends DexProtocol {
  public name = 'shade' as DexProtocolName
  public pools: IPool[];
  constructor(public readonly rpcEndpoint: string) {
    super();
  }
  public override calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: IPool[]): { route: IRoute; amountOut: Amount } {
    const startingToken = getShadeTokenBySymbol(tokenInId);
    const endingToken = getShadeTokenBySymbol(tokenOutId);
    const [route] = calculateBestShadeSwapRoutes({
      inputTokenAmount: BigNumber(amountIn.multipliedBy(10**startingToken.decimals)),
      startingTokenId: startingToken.id,
      endingTokenId: endingToken.id,
      isReverse: false,
      maxHops: 6,
    })
    return {
      route: route.route.map(r => ({
        ...(r as any)
      })),
      amountOut: convertCoinFromUDenomV2(route.quoteOutputAmount, endingToken.decimals)
    }
  }

  public override subscribeToPoolsUpdate(retryTime = 300): Observable<{ pools: IPool[]; height: number }> {
    return new Observable<{ pools: IPool[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getShadePairs()
        .then(shadePairs => {
          const latestPools = shadePairs.map(sp => ({
            poolId: sp.name as PoolId,
            dex: 'shade' as DexProtocolName,
            token0Id: toTokenId(sp.token0),
            token0Amount: BigNumber(sp.token0.amount),
            token1Id: toTokenId(sp.token1),
            token1Amount: BigNumber(sp.token1.amount),
          }));
          this.pools = latestPools;
          return observer.next({
            pools: latestPools,
            height: blockHeight,
          });
        }).catch(console.error), console.error);
    });
  }
}
