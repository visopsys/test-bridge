use std::str::FromStr;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

use spl_token::ID;

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
                let user = next_account_info(accounts_iter)?;
                let bridge = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

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
                bridge_state.serialize(&mut *bridge.data.borrow_mut())?;
            }

            BridgeInstruction::TransferOut => {
                msg!("Transfering token to this bridge...");

                let user = next_account_info(accounts_iter)?;
                let token_program_ai = next_account_info(accounts_iter)?;
                let mint_ai = next_account_info(accounts_iter)?;
                let source_ai = next_account_info(accounts_iter)?;
                let destination_ai = next_account_info(accounts_iter)?;
                let bridge_pda = next_account_info(accounts_iter)?;

                let bridge_state = BridgeData::try_from_slice(&bridge_pda.data.borrow())?;

                msg!(
                    "user, token, destination key = {:?}, {:?}, {:?}",
                    user.key,
                    mint_ai.key,
                    destination_ai.key
                );

                // Transfer token to this bridge account.
                invoke_signed(
                    &spl_token::instruction::transfer(
                        &spl_token::ID,
                        source_ai.key,
                        destination_ai.key,
                        bridge_pda.key,
                        &[bridge_pda.key],
                        1_000,
                    )?,
                    &[
                        source_ai.clone(),
                        destination_ai.clone(),
                        bridge_pda.clone(),
                        token_program_ai.clone(),
                    ],
                    &[&[b"SisuBridge", &[bridge_state.bump]]],
                )?;
                msg!("Invokation is successful");

                // Payload
                let payload = TransferOutData::try_from_slice(&data_vec[1..]).unwrap();
                msg!("Recipient = {:?}", payload.recipient);
            }
        }

        Ok(())
    }
}
