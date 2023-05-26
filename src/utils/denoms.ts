// noinspection CommaExpressionJS

import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import { sha256 } from '@cosmjs/crypto';
import bigInteger from 'big-integer';
import { Amount, Brand } from '../dex/types/dex-types';

export type IBCHash = Brand<string, "IBCHash">;

export const convertCoinToUDenomV2 = (input: string | number | bigInteger.BigInteger | BigNumber, decimals: number): Amount => {
  return typeof input === 'string' || typeof input === 'number' ?
    BigNumber(input)
      .multipliedBy(BigNumber(10).pow(decimals)) :
    BigNumber(input.toString()).multipliedBy(BigNumber(10).pow(decimals));
};
export const convertCoinFromUDenomV2 = (input: string | bigInteger.BigInteger | BigNumber,decimals:number): Amount =>(BigNumber.config({
  DECIMAL_PLACES: 18
}),BigNumber(input.toString()).dividedBy(BigNumber(10).pow(decimals)))

export function makeIBCMinimalDenom(
  sourceChannelId: string,
  coinMinimalDenom: string
): IBCHash {
  return (
    "ibc/" +
    Buffer.from(
        sha256(
          Buffer.from(`transfer/${sourceChannelId}/${coinMinimalDenom}`)
        )
      )
      .toString("hex")
      .toUpperCase()
  ) as IBCHash;
}
