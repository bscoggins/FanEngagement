use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Closed @ GovernanceError::ProposalNotClosedForFinalization
    )]
    pub proposal: Account<'info, ProposalAccount>,
    
    #[account(
        mut,
        constraint = results.proposal_id == proposal.proposal_id @ GovernanceError::ResultsNotFound
    )]
    pub results: Account<'info, ProposalResultsAccount>,
    
    #[account(
        seeds = [
            b"organization",
            &proposal.organization_id
        ],
        bump = organization.bump
    )]
    pub organization: Account<'info, OrganizationAccount>,
    
    #[account(
        constraint = organization.authority == authority.key() @ GovernanceError::Unauthorized
    )]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<FinalizeProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let results = &mut ctx.accounts.results;
    let clock = Clock::get()?;
    
    // Update proposal status to Finalized
    proposal.status = ProposalStatus::Finalized;
    proposal.updated_at = clock.unix_timestamp;
    
    // Update results finalized timestamp
    results.finalized_at = Some(clock.unix_timestamp);
    
    msg!("Proposal finalized: {:?}", proposal.proposal_id);
    
    Ok(())
}

