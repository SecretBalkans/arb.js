import { Brand } from "../../ts";

export interface TokenPriceInfo {
  id: string;
  name: string;
  value: string;
}


export interface RawShadeContract {
  'contract_address': SecretContractAddress;
  'code_hash': string;
}

export interface ShadeContract {
  'address': SecretContractAddress;
  'code_hash': string;
}

export interface SnipPoolToken extends Snip20Token {
  amount?: number;
  price?: number;
}

export interface Snip20Token extends ShadeContract {
  'name': string,
  'symbol': string,
  'decimals': number,

  'total_supply': AmountString,
}

export type SecretContractAddress = Brand<string, "ContractAddress">;
export type AmountString = Brand<string, "Amount">;
export type Timestamp = Brand<number, "Timestamp">;

export interface StakingContract extends ShadeContract {
  'lp_token': ShadeContract,
  'amm_pair': SecretContractAddress,
  'admin_auth': ShadeContract,
  'query_auth': ShadeContract,
  'total_amount_staked': AmountString,
  'reward_tokens': {
    'token': Snip20Token,
    'decimals': number,
    'reward_per_second': AmountString,
    'reward_per_staked_token': AmountString,
    'valid_to': Timestamp,
    'last_updated': Timestamp
  }[]
}
