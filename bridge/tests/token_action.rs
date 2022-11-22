use std::str::FromStr;
use solana_program::{
    system_program,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
};
use {
    solana_program_test::BanksClient,
    solana_sdk::{
        hash::Hash,
        program_pack::Pack,
        signature::{Keypair, Signer},
        system_instruction,
        transaction::Transaction,
        transport::TransportError,
    },
    spl_token::{
        id, instruction,
        instruction::TokenInstruction,
        state::{Account, Mint},
    },
    spl_associated_token_account::{
        instruction::create_associated_token_account,
    }
};

pub fn get_ata_program_id() -> Pubkey {
    return Pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL").unwrap();
}

pub fn get_token_program_id() -> Pubkey {
    return Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
}


pub async fn create_mint(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: Hash,
    pool_mint: &Keypair,
    decimals: u8,
) -> Result<(), TransportError> {
    let rent = banks_client.get_rent().await.unwrap();
    let mint_rent = rent.minimum_balance(Mint::LEN);

    let transaction = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account(
                &payer.pubkey(),
                &pool_mint.pubkey(),
                mint_rent,
                Mint::LEN as u64,
                &get_token_program_id(),
            ),
            instruction::initialize_mint(&get_token_program_id(), &pool_mint.pubkey(),
                                         &payer.pubkey(), None, decimals)
                .unwrap(),
        ],
        Some(&payer.pubkey()),
        &[payer, pool_mint],
        recent_blockhash,
    );
    banks_client.process_transaction(transaction).await?;
    Ok(())
}

pub fn get_token_ata(mint: Pubkey, owner: Pubkey) -> Pubkey {
    let (ata, _) = Pubkey::find_program_address(
        &[owner.as_ref(), get_token_program_id().as_ref(), mint.as_ref()],
        &get_ata_program_id()
    );
    return ata;
}

pub async fn create_associated_account(
    banks_client: &mut BanksClient,
    recent_blockhash: Hash,
    payer: &Keypair,
    owner: &Pubkey,
    mint: &Pubkey,
) -> Result<(), TransportError> {
    let ix = create_associated_token_account(&payer.pubkey(), &owner, &mint, &get_token_program_id());
    let mut transaction = Transaction::new_with_payer(
        &[
            ix
        ],
        Some(&payer.pubkey()),
    );

    transaction.sign(&[payer], recent_blockhash);
    banks_client.process_transaction(transaction).await?;
    Ok(())
}

pub async fn mint_to(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: Hash,
    mint: &Pubkey,
    account: &Pubkey,
    owner: &Pubkey,
    amount: u64,
) -> Result<(), TransportError> {
    let ix = instruction::mint_to_checked(
        &get_token_program_id(),
        mint,
        account,
        owner,
        &[&payer.pubkey()],
        amount,
        8,
    ).unwrap();

    let mut transaction = Transaction::new_with_payer(
        &[
            ix
        ],
        Some(&payer.pubkey()),
    );

    transaction.sign(&[payer], recent_blockhash);
    banks_client.process_transaction(transaction).await.unwrap();
    Ok(())
}

pub async fn transfer(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: Hash,
    source: &Pubkey,
    destination: &Pubkey,
    authority: &Keypair,
    amount: u64,
) -> Result<(), TransportError> {
    let transaction = Transaction::new_signed_with_payer(
        &[
            instruction::transfer(&id(), source, destination, &authority.pubkey(), &[], amount)
                .unwrap(),
        ],
        Some(&payer.pubkey()),
        &[payer, authority],
        recent_blockhash,
    );
    banks_client.process_transaction(transaction).await?;
    Ok(())
}
