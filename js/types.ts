import BN from "bn.js";

class TransferOutData {
  amount: BN = new BN(0);
  tokenAddress: string = "";
  chainId: number = 0;
  recipient: string = "";

  public constructor(init?:Partial<TransferOutData>) {
    Object.assign(this, init);
  }
}

const TransferOutDataSchema = new Map([[TransferOutData,
  { kind: 'struct',
    fields: [['amount', 'u128'], ['tokenAddress', 'string'], ['chainId', 'u64'], ['recipient', 'string']]
  }
]]);

class TransferInData {
  amount: BN = new BN(0);

  public constructor(init?:Partial<TransferOutData>) {
    Object.assign(this, init);
  }
}

const TransferInDataSchema =  new Map([[TransferOutData,
  { kind: 'struct',
    fields: [['amount', 'u128']]
  }
]]);

export {
  TransferOutData,
  TransferOutDataSchema,
  TransferInData,
  TransferInDataSchema
}
