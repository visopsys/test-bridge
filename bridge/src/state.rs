use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum BridgeInstruction {
    Initialize,
    TransferOut,
    TransferIn,
    AddSpender,
    RemoveSpender,
    ChangeAdmin,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
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
pub struct TransferIn {
    pub amount: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AddSpenderData {
    pub spender: Pubkey, // 32 bytes
}

#[test]
fn test_simple_struct() {
    let transfer_out = TransferOutData {
        amount: 900,
        token_address: "0x1234".to_string(),
        chain_id: 123,
        recipient: "someone".to_string(),
    };
    let encoded_a = transfer_out.try_to_vec().unwrap();
    let decoded_a = TransferOutData::try_from_slice(&encoded_a).unwrap();
    assert_eq!(transfer_out, decoded_a);

    println!("encoded_a length = {:?}", encoded_a.len());
    println!("encoded_a = {:?}", encoded_a);

    println!(
        "encoded_a base58 = {:?}",
        bs58::encode(encoded_a).into_string()
    );
}
