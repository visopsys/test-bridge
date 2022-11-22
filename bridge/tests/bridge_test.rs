#![cfg(feature = "test-bpf")]

mod token_action;
mod action;
use std::{print, println};
use {
    borsh::{BorshDeserialize, BorshSerialize},
    assert_matches::*,
    sisu_bridge::processor::Processor,
    sisu_bridge::state::BridgeInstruction,
    sisu_bridge::state::BridgeStateV0,
    sisu_bridge::state::TransferInIx,
    solana_program::instruction::{AccountMeta, Instruction},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        hash::Hash,
        msg,
        program::invoke_signed,
        program_error::ProgramError,
        pubkey::Pubkey,
        system_instruction, system_program,
        sysvar::{rent::Rent, Sysvar},
    },
    solana_program_test::*,
    solana_sdk::{
        program_pack::Pack, signature::Keypair, signature::Signer, transaction::Transaction,
        transport::TransportError,
    },
    spl_token::{id, instruction, state::Mint, state::Account as SplTokenAccount},
};

const TRANSFER_AMOUNT: u64 = 1_000_000_000_000_000;

async fn initialize() -> (BanksClient, Keypair, Pubkey, Hash) {
    let program_id = Pubkey::new_unique();
    let seed_string = b"SisuBridge";
    let (bridge_pda, _) = Pubkey::find_program_address(&[seed_string], &program_id);

    let (mut banks_client, payer, recent_blockhash) = ProgramTest::new(
        "sisu_bridge",
        program_id,
        processor!(Processor::process_instruction),
    )
    .start()
    .await;

    let data = BridgeInstruction::try_to_vec(&BridgeInstruction::Initialize).unwrap();
    let mut transaction = Transaction::new_with_payer(
        &[Instruction {
            program_id,
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

    return (banks_client, payer, bridge_pda, recent_blockhash);
}

#[tokio::test]
async fn test_initialize() {
    initialize().await;
}

#[tokio::test]
async fn test_transfer_in() {
    let (mut banks_client, payer, bridge_pda, recent_blockhash) = initialize().await;

    let mint = Keypair::new();
    let decimals = 9;

    token_action::create_mint(
        &mut banks_client,
        &payer,
        recent_blockhash,
        &mint,
        decimals,
    )
    .await
    .unwrap();

    //Create user ata
    let payer_ata = token_action::get_token_ata(mint.pubkey(), payer.pubkey());
    token_action::create_associated_account(
        &mut banks_client,
        recent_blockhash,
        &payer,
        &payer.pubkey(),
        &mint.pubkey()
    ).await.unwrap();

    // Create bridge ata
    let bridge_ata = token_action::get_token_ata(mint.pubkey(), bridge_pda);
    token_action::create_associated_account(
        &mut banks_client,
        recent_blockhash,
        &payer,
        &bridge_pda,
        &mint.pubkey()
    ).await.unwrap();

    // Mint to bridge ata
    token_action::mint_to(&mut banks_client, &payer, recent_blockhash, &mint.pubkey(),
                          &payer_ata, &payer.pubkey(), 1_000_000_000_000_000);

    let account = banks_client.get_account(payer_ata).await.unwrap().unwrap();
    println!("AAAAA balance = {:?}", account);

    let source_token = SplTokenAccount::unpack(&account.data).unwrap();
    println!("bridge_pda = {:?}", bridge_pda);
    println!("owner = {:?}", source_token.owner);
    println!("amount = {:?}", source_token.amount);
}

