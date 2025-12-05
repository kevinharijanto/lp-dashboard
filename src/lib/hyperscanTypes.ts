// src/lib/hyperscanTypes.ts

export type HyperscanAddressTxItem = {
  hash: string;
  method: string | null; // "multicall", "transfer", etc.
  value: string;         // native amount in wei
  timestamp: string;     // ISO string
  chain: string;         // "hyperliquid" or similar

  from: { hash: string };
  to: { hash: string | null; name: string | null };

  decoded_input: {
    method_call: string | null;
    method_id: string | null;
    parameters: Array<{
      name: string;
      type: string;
      value: string[];         // for multicall(bytes[] data)
    }> | null;
  } | null;

  // if Hyperscan provides transfers, wire them here:
  token_transfers: null | Array<{
    from: { hash: string };
    to: { hash: string };
    token: { hash: string };
    value: string;            // decimal string
  }>;
};

export type HyperscanNextPageParams = {
  index: number;
  value: string;
  hash: string;
  inserted_at: string;
  block_number: number;
  fee: string;
  items_count: number;
};

export type HyperscanAddressTxResponse = {
  items: HyperscanAddressTxItem[];
  next_page_params?: HyperscanNextPageParams | null;
};
