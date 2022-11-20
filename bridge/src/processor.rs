use core::slice::Iter;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction, system_program,
    sysvar::{rent::Rent, Sysvar},
};

use crate::error::BridgeError;
use crate::state::{AddSpenderData, BridgeInstruction, BridgeStateV0, TransferIn, TransferOutData};
pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let data_vec = instruction_data.to_vec();
        assert!(data_vec.len() > 0, "Instruction data cannot be empty");

        let instruction = BridgeInstruction::try_from_slice(&[data_vec[0]])
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        let accounts_iter = &mut accounts.iter();

        match instruction {
            BridgeInstruction::Initialize => {
                return Processor::initialize(accounts_iter, program_id);
            }

            BridgeInstruction::TransferOut => {
                return Processor::transfer_out(accounts_iter, data_vec);
            }

            BridgeInstruction::TransferIn => {
                return Processor::transfer_in(accounts_iter, data_vec);
            }

            BridgeInstruction::AddSpender => {
                return Processor::add_spender(accounts_iter, data_vec);
            }

            BridgeInstruction::RemoveSpender => Err(BridgeError::NotImplemented.into()),
            BridgeInstruction::ChangeAdmin => Err(BridgeError::NotImplemented.into()),
        }
    }

    fn initialize(accounts_iter: &mut Iter<AccountInfo>, program_id: &Pubkey) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;
        let sys_program = next_account_info(accounts_iter)?;

        let seed_string = b"SisuBridge";

        // Verification
        assert!(user.is_signer, "initialize: User must sign the message");
        assert!(
            bridge_pda.is_writable,
            "initialize: Bridge pda must be writable"
        );
        assert_eq!(bridge_pda.owner, &system_program::ID);
        assert!(system_program::check_id(sys_program.key));

        // Check that the bridge pda matches the expected pda.
        let (calculated_pda, bump) = Pubkey::find_program_address(&[seed_string], program_id);
        assert_eq!(bridge_pda.key, &calculated_pda);

        // Create the pda account
        invoke_signed(
            &system_instruction::create_account(
                user.key,
                bridge_pda.key,
                Rent::get()?.minimum_balance(99),
                99,
                &program_id,
            ),
            // making sure downstream program has all necessary data
            &[user.clone(), bridge_pda.clone(), sys_program.clone()],
            &[&[seed_string, &[bump]]], // signature
        )?;

        let bridge_state = BridgeStateV0 {
            version: 0,
            bump,
            admin: *user.key,
            spenders: [*user.key, *user.key],
            spender_index: 0,
        };

        bridge_state.serialize(&mut *bridge_pda.data.borrow_mut())?;

        Ok(())
    }

    fn transfer_out(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let token_program_ai = next_account_info(accounts_iter)?;
        let user_associated_token = next_account_info(accounts_iter)?;
        let bridge_associated_token = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;

        msg!(
            "userATA = {:?}, bridgeAta = {:?}",
            user_associated_token.key,
            bridge_associated_token.key
        );

        // Validation
        assert!(user.is_signer, "transfer_out: User must sign the message");

        // Payload
        let payload = TransferOutData::try_from_slice(&data_vec[1..]).unwrap();
        msg!(
            "Recipient = {:?} -- Amount = {:?}",
            payload.recipient,
            payload.amount
        );

        // Transfer token to this bridge account.
        let bridge_state = BridgeStateV0::try_from_slice(&bridge_pda.data.borrow())?;
        invoke_signed(
            &spl_token::instruction::transfer(
                &spl_token::ID,
                user_associated_token.key,
                bridge_associated_token.key,
                bridge_pda.key,
                &[bridge_pda.key],
                payload.amount,
            )?,
            &[
                user_associated_token.clone(),
                bridge_associated_token.clone(),
                bridge_pda.clone(),
                token_program_ai.clone(),
            ],
            &[&[b"SisuBridge", &[bridge_state.bump]]],
        )?;

        Ok(())
    }

    fn transfer_in(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        // Authority checking. Make sure the caller is the spender or owner of this bridge pda.
        let user_associated_token = next_account_info(accounts_iter)?;
        let token_program_ai = next_account_info(accounts_iter)?;
        let bridge_spender = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;
        let bridge_associated_token = next_account_info(accounts_iter)?;

        let bridge_state = BridgeStateV0::try_from_slice(&bridge_pda.data.borrow())?;

        // Verify that user is one of the spenders
        assert!(
            bridge_spender.is_signer,
            "transfer_in: User must sign the message"
        );

        // Check that user is one of the spenders
        let mut found = false;
        for spender in bridge_state.spenders {
            if spender == *bridge_spender.key {
                found = true;
                break;
            }
        }
        if found == false {
            return Err(BridgeError::NotAnAdmin.into());
        }

        // Deserialize transfer in amount.
        let transfer_in = TransferIn::try_from_slice(&data_vec[1..]).unwrap();

        // Transfer token from bridge to user.
        invoke_signed(
            &spl_token::instruction::transfer(
                &spl_token::ID,
                bridge_associated_token.key,
                user_associated_token.key,
                bridge_pda.key,
                &[bridge_pda.key],
                transfer_in.amount,
            )?,
            &[
                user_associated_token.clone(),
                bridge_associated_token.clone(),
                bridge_pda.clone(),
                token_program_ai.clone(),
            ],
            &[&[b"SisuBridge", &[bridge_state.bump]]],
        )?;

        Ok(())
    }

    fn add_spender(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;
        assert!(user.is_signer, "add_spender: User must sign the message");

        // Get the bridge state.
        let mut bridge_state = BridgeStateV0::try_from_slice(&bridge_pda.data.borrow())?;

        // Validation
        assert_eq!(
            user.key, &bridge_state.admin,
            "add_spender: user is not an admin"
        );
        assert_eq!(bridge_state.spenders.len(), 2);

        // Update spender
        let new_spender = AddSpenderData::try_from_slice(&data_vec).unwrap().spender;
        let index = bridge_state.spender_index;
        bridge_state.spenders[((index + 1) % 2) as usize] = new_spender;

        // Serialize back to the bridge pda.
        bridge_state.serialize(&mut *bridge_pda.data.borrow_mut())?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use {
        super::*,
        assert_matches::*,
        solana_program::instruction::{AccountMeta, Instruction},
        solana_program_test::*,
        solana_sdk::{signature::Signer, transaction::Transaction},
    };

    #[tokio::test]
    async fn test_initialize() {
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
    }
}
