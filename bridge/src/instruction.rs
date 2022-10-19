use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum CounterInstruction {
    Increment, // unsigned byte
    Decrement, // unsigned byte
}

pub fn increment(
    program_id: Pubkey,
    counter: Pubkey,
    proxy: Pubkey,
    instruction: CounterInstruction,
) -> Result<Instruction, ProgramError> {
    // TODO Fix instruction
    msg!("there are 2 accounts");
    Ok(Instruction {
        accounts: vec![
            AccountMeta::new(counter, false),
            AccountMeta::new(proxy, false),
        ],
        data: instruction.try_to_vec()?,
        program_id,
    })
}
