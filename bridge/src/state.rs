use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum BridgeInstruction {
    Initialize,
    TransferOut,
    TransferIn,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct BridgeData {
    pub bump: u8,            // 1 byte
    pub admins: [Pubkey; 3], // 32 * 3 bytes
    pub admin_index: u8,     // 1 byte
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct TransferOutData {
    pub amount: u128,
    pub token_address: String,
    pub chain_id: u64,
    pub recipient: String,
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
