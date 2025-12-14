use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(organization_id: [u8; 16], name: String)]
pub struct CreateOrganization<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + OrganizationAccount::LEN,
        seeds = [
            b"organization",
            organization_id.as_ref()
        ],
        bump
    )]
    pub organization: Account<'info, OrganizationAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateOrganization>,
    organization_id: [u8; 16],
    name: String,
) -> Result<()> {
    // Validate name length
    require!(
        name.len() <= OrganizationAccount::MAX_NAME_LENGTH,
        GovernanceError::NameTooLong
    );
    
    let organization = &mut ctx.accounts.organization;
    let clock = Clock::get()?;
    
    organization.organization_id = organization_id;
    organization.name = name;
    organization.created_at = clock.unix_timestamp;
    organization.authority = ctx.accounts.authority.key();
    organization.proposal_count = 0;
    organization.bump = ctx.bumps.organization;
    
    msg!("Organization created: {:?}", organization_id);
    
    Ok(())
}

