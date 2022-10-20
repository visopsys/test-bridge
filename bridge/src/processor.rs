use core::slice::Iter;
use std::str::FromStr;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

use crate::error::BridgeError;
use crate::state::{BridgeData, BridgeInstruction, TransferOutData};
pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let data_vec = instruction_data.to_vec();
        assert!(data_vec.len() > 0, "Instruction data cannot be empty");

        let instruction = BridgeInstruction::try_from_slice(&[data_vec[0]])
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        let program_id = Pubkey::from_str("HguMTvmDfspHuEWycDSP1XtVQJi47hVNAyLbFEf2EJEQ").unwrap();
        let (bridge_key, bump) = Pubkey::find_program_address(&[b"SisuBridge"], &program_id);
        msg!("bridge_key, bump = {:?}, {:?}", bridge_key, bump);

        let accounts_iter = &mut accounts.iter();

        match instruction {
            BridgeInstruction::Initialize => {
                return Processor::initialize(accounts_iter, program_id, bump);
            }

            BridgeInstruction::TransferOut => {
                return Processor::transfer_out(accounts_iter, data_vec);
            }

            BridgeInstruction::TransferIn => {
                return Processor::transfer_in(accounts_iter, data_vec);
            }
        }
    }

    fn initialize(
        accounts_iter: &mut Iter<AccountInfo>,
        program_id: Pubkey,
        bump: u8,
    ) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let bridge = next_account_info(accounts_iter)?;
        let system_program = next_account_info(accounts_iter)?;

        assert!(user.is_signer, "initialize: User must sign the message");

        invoke_signed(
            &system_instruction::create_account(
                user.key,
                bridge.key,
                Rent::get()?.minimum_balance(1),
                1,
                &program_id,
            ),
            // making sure downstream program has all necessary data
            &[user.clone(), bridge.clone(), system_program.clone()],
            &[&[b"SisuBridge", &[bump]]], // signature
        )?;

        let mut bridge_state = BridgeData::try_from_slice(&bridge.data.borrow())?;
        bridge_state.bump = bump;
        bridge_state.admins[0] = *user.key;
        bridge_state.admin_index = 0;

        bridge_state.serialize(&mut *bridge.data.borrow_mut())?;

        Ok(())
    }

    fn transfer_out(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        let user = next_account_info(accounts_iter)?;
        let token_program_ai = next_account_info(accounts_iter)?;
        let user_associated_token = next_account_info(accounts_iter)?;
        let bridge_associated_token = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;

        let bridge_state = BridgeData::try_from_slice(&bridge_pda.data.borrow())?;

        msg!(
            "user, destination key = {:?}, {:?}",
            user.key,
            bridge_associated_token.key
        );

        // Transfer token to this bridge account.
        invoke_signed(
            &spl_token::instruction::transfer(
                &spl_token::ID,
                user_associated_token.key,
                bridge_associated_token.key,
                bridge_pda.key,
                &[bridge_pda.key],
                1_000,
            )?,
            &[
                user_associated_token.clone(),
                bridge_associated_token.clone(),
                bridge_pda.clone(),
                token_program_ai.clone(),
            ],
            &[&[b"SisuBridge", &[bridge_state.bump]]],
        )?;
        msg!("Invokation is successful");

        // Payload
        let payload = TransferOutData::try_from_slice(&data_vec[1..]).unwrap();
        msg!("Recipient = {:?}", payload.recipient);

        Ok(())
    }

    fn transfer_in(accounts_iter: &mut Iter<AccountInfo>, data_vec: Vec<u8>) -> ProgramResult {
        // Authority checking. Make sure the caller is the spender or owner of this bridge pda.
        let bridge_admin = next_account_info(accounts_iter)?;
        let token_program_ai = next_account_info(accounts_iter)?;
        let mint_ai = next_account_info(accounts_iter)?;

        let user_associated_token = next_account_info(accounts_iter)?;
        let bridge_associated_token = next_account_info(accounts_iter)?;
        let bridge_pda = next_account_info(accounts_iter)?;

        let bridge_state = BridgeData::try_from_slice(&bridge_pda.data.borrow())?;

        // Verify that user is one of the spenders
        assert!(
            bridge_admin.is_signer,
            "transfer_in: User must sign the message"
        );

        // Check that user is one of the admin
        let mut found = false;
        for admin in bridge_state.admins {
            if admin == *bridge_admin.key {
                found = true;
                break;
            }
        }
        if found == false {
            return Err(BridgeError::NotAnAdmin.into());
        }

        // Transfer token from bridge to user.
        invoke_signed(
            &spl_token::instruction::transfer(
                &spl_token::ID,
                bridge_associated_token.key,
                user_associated_token.key,
                bridge_pda.key,
                &[bridge_pda.key],
                1_000,
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
}
