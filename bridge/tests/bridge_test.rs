#![cfg(feature = "test-bpf")]

mod token_action;
use sisu_bridge::state;
use {
    assert_matches::*,
    borsh::{BorshDeserialize, BorshSerialize},
    sisu_bridge::processor::Processor,
    sisu_bridge::state::BridgeInstruction,
    sisu_bridge::state::BridgeStateV0,
    sisu_bridge::state::TransferInIx,
    solana_program::instruction::{AccountMeta, Instruction},
    solana_program::{hash::Hash, pubkey::Pubkey, system_program},
    solana_program_test::*,
    solana_sdk::{
        program_pack::Pack, signature::Keypair, signature::Signer, transaction::Transaction,
    },
    spl_token::state::Account as SplTokenAccount,
};

const INIT_AMOUNT: u64 = 1_000_000_000_000_000;

async fn initialize() -> (BanksClient, Keypair, Pubkey, Pubkey, Hash) {
    let bridge_program_id = Pubkey::new_unique();
    let seed_string = b"SisuBridge";
    let (bridge_pda, _) = Pubkey::find_program_address(&[seed_string], &bridge_program_id);

    let (mut banks_client, payer, recent_blockhash) = ProgramTest::new(
        "sisu_bridge",
        bridge_program_id,
        processor!(Processor::process_instruction),
    )
    .start()
    .await;

    let data = BridgeInstruction::try_to_vec(&BridgeInstruction::Initialize).unwrap();
    let mut transaction = Transaction::new_with_payer(
        &[Instruction {
            program_id: bridge_program_id,
            accounts: vec![
                AccountMeta::new(payer.pubkey(), false),
                AccountMeta::new(bridge_pda, false),
                AccountMeta::new(system_program::id(), false),
            ],
            data,
        }],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer], recent_blockhash);
    assert_matches!(banks_client.process_transaction(transaction).await, Ok(()));

    // Make sure the new
    assert_matches!(banks_client.get_account(bridge_pda).await, Ok(_));

    let account = banks_client.get_account(bridge_pda).await.unwrap().unwrap();

    let state = BridgeStateV0::try_from_slice(account.data.as_slice()).unwrap();
    assert_eq!(payer.pubkey(), state.admin);

    return (
        banks_client,
        payer,
        bridge_program_id,
        bridge_pda,
        recent_blockhash,
    );
}

#[tokio::test]
async fn test_initialize() {
    initialize().await;
}

async fn create_token_and_bridge_ata(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    bridge_pda: &Pubkey,
    recent_blockhash: Hash,
) -> (Keypair, Pubkey) {
    let mint = Keypair::new();
    let decimals = 8;

    token_action::create_mint(banks_client, recent_blockhash, &payer, &mint, decimals)
        .await
        .unwrap();

    // Create bridge_ata
    let bridge_ata = token_action::create_associated_account(
        banks_client,
        recent_blockhash,
        &payer,
        &bridge_pda,
        &mint.pubkey(),
    )
    .await
    .unwrap();

    // Mint to the bridge ata
    token_action::mint_to(
        banks_client,
        recent_blockhash,
        &payer,
        &mint.pubkey(),
        &bridge_ata,
        &payer,
        INIT_AMOUNT,
    )
    .await
    .unwrap();

    // Verify the bridge ata has expected amount
    let account = banks_client.get_account(bridge_ata).await.unwrap().unwrap();
    let account_token = SplTokenAccount::unpack(&account.data).unwrap();
    assert_eq!(account_token.amount, INIT_AMOUNT);

    return (mint, bridge_ata);
}

#[tokio::test]
async fn test_transfer_in() {
    let (mut banks_client, payer, bridge_program_id, bridge_pda, recent_blockhash) =
        initialize().await;
    let (mint, bridge_ata) =
        create_token_and_bridge_ata(&mut banks_client, &payer, &bridge_pda, recent_blockhash).await;

    // Do a transfer in
    let amount = 1000;
    let ix = TransferInIx::from_data(state::TransferInData {
        nonce: 1,
        amounts: vec![amount],
    });

    let user = Keypair::new();
    let user_ata = token_action::create_associated_account(
        &mut banks_client,
        recent_blockhash,
        &payer,
        &user.pubkey(),
        &mint.pubkey(),
    )
    .await
    .unwrap();

    // Make the transfer request
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction {
            program_id: bridge_program_id,
            accounts: vec![
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new_readonly(spl_token::id(), false),
                AccountMeta::new_readonly(bridge_pda, false),
                AccountMeta::new(bridge_ata, false),
                AccountMeta::new(user_ata, false),
            ],
            data: ix.try_to_vec().unwrap(),
        }],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client.process_transaction(transaction).await.unwrap();

    // Check balance
    let solana_account = banks_client.get_account(user_ata).await.unwrap().unwrap();
    let token_account = spl_token::state::Account::unpack(solana_account.data.as_slice()).unwrap();
    assert_eq!(amount, token_account.amount);
}
