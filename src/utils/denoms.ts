// noinspection CommaExpressionJS

import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import { sha256 } from '@cosmjs/crypto';

export const convertCoinToUDenomV2 = (input: string | number | BigNumber, denom: number) => typeof input == 'string' || typeof input == 'number' ? BigNumber(input).multipliedBy(BigNumber(10).pow(denom)).toFixed(0) : input.multipliedBy(BigNumber(10).pow(denom)).toFixed(0);
export const convertCoinFromUDenomV2 = (input: string | BigNumber,denom:number)=>(BigNumber.config({
  DECIMAL_PLACES: 18
}),BigNumber(input).dividedBy(BigNumber(10).pow(denom)))

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
