use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub enum BridgeInstruction {
    Initialize,
    TransferOut,
    TransferIn,
    AddSpender,
    RemoveSpender,
    ChangeAdmin,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct BridgeStateV0 {
    pub version: u8,
    pub bump: u8,              // 1 byte
    pub admin: Pubkey,         // 32
    pub spenders: [Pubkey; 2], // 32 * 2 bytes
    pub spender_index: u8,     // 1 byte
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct TransferOutData {
    pub amount: u64,
    pub token_address: String,
    pub chain_id: u64,
    pub recipient: String,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct TransferInData {
    pub amounts: Vec<u64>,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct TransferInIx {
    pub bridge_ix: BridgeInstruction,
    pub transfer_data: TransferInData,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AddSpenderData {
    pub spender: Pubkey, // 32 bytes
}

impl TransferInIx {
    pub fn from_data(data: TransferInData) -> TransferInIx {
        return TransferInIx{
            bridge_ix: BridgeInstruction::TransferIn,
            transfer_data: data,
        }
    }
}

#[cfg(test)]
mod test {
    use crate::state::TransferInData;
    use crate::state::TransferOutData;
    use borsh::{BorshDeserialize, BorshSerialize};
    use solana_program::pubkey::Pubkey;

    #[test]
    fn test_serialize_transfer_in() {
        let transfer_in = TransferInData {
            amounts: vec![1, 2, 3],
        };

        let encoded_a = transfer_in.try_to_vec().unwrap();
        let decoded_a = TransferInData::try_from_slice(&encoded_a).unwrap();
        assert_eq!(transfer_in.amounts, decoded_a.amounts);
    }

    #[test]
    fn test_serialize_transfer_out() {
        let transfer_out = TransferOutData {
            amount: 900,
            token_address: "0x1234".to_string(),
            chain_id: 123,
            recipient: "someone".to_string(),
        };
        let encoded_a = transfer_out.try_to_vec().unwrap();
        let decoded_a = TransferOutData::try_from_slice(&encoded_a).unwrap();
        assert_eq!(transfer_out, decoded_a);
    }
}
