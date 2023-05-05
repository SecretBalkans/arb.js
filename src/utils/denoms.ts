// noinspection CommaExpressionJS

import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import { sha256 } from '@cosmjs/crypto';
import bigInteger from 'big-integer';
import { Amount } from '../dex/types/swap-types';

export const convertCoinToUDenomV2 = (input: string | number | bigInteger.BigInteger | BigNumber, denom: number): bigInteger.BigNumber => {
  return bigInteger((typeof input == 'string' || typeof input == 'number' ?
    BigNumber(input)
      .multipliedBy(BigNumber(10).pow(denom)).toFixed(0) :
    BigNumber(input.toString()).multipliedBy(BigNumber(10).pow(denom)).toFixed(0)).toString());
};
export const convertCoinFromUDenomV2 = (input: string | bigInteger.BigInteger | BigNumber,denom:number): Amount =>(BigNumber.config({
  DECIMAL_PLACES: 18
}),BigNumber(input.toString()).dividedBy(BigNumber(10).pow(denom)))

export function makeIBCMinimalDenom(
  sourceChannelId: string,
  coinMinimalDenom: string
): string {
  return (
    "ibc/" +
    Buffer.from(
        sha256(
          Buffer.from(`transfer/${sourceChannelId}/${coinMinimalDenom}`)
        )
      )
      .toString("hex")
      .toUpperCase()
  );
}
