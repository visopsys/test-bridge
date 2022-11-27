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
    fields: [['amount', 'u64'], ['tokenAddress', 'string'], ['chainId', 'u64'], ['recipient', 'string']]
  }
]]);

class TransferInData {
  nonce: number = 0;
  amount: Array<number> = [];

  public constructor(init?:Partial<TransferInData>) {
    Object.assign(this, init);
  }
}

const TransferInDataSchema =  new Map([[TransferInData,
  { kind: 'struct',
    fields: [['nonce', 'u64'], ['amount', ['u64']]]
  }
]]);

export {
  TransferOutData,
  TransferOutDataSchema,
  TransferInData,
  TransferInDataSchema
}
