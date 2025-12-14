use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct UpdateProposalStatus<'info> {
    #[account(mut)]
    pub proposal: Account<'info, ProposalAccount>,
    
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
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<UpdateProposalStatus>,
    new_status: ProposalStatus,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;
    
    // Validate state transition
    let current_status = proposal.status;
    let is_valid_transition = match (current_status, new_status) {
        (ProposalStatus::Draft, ProposalStatus::Open) => {
            // Validate that dates are set when opening
            if proposal.start_at.is_none() || proposal.end_at.is_none() {
                return Err(GovernanceError::InvalidTimeRange.into());
            }
            // Validate time range
            if let (Some(start), Some(end)) = (proposal.start_at, proposal.end_at) {
                if start >= end {
                    return Err(GovernanceError::InvalidTimeRange.into());
                }
            }
            true
        }
        (ProposalStatus::Open, ProposalStatus::Closed) => true,
        (ProposalStatus::Closed, ProposalStatus::Finalized) => {
            // Finalization should use finalize_proposal instruction
            return Err(GovernanceError::InvalidStateTransition.into());
        }
        _ => false,
    };
    
    require!(is_valid_transition, GovernanceError::InvalidStateTransition);
    
    // Update status and timestamp
    proposal.status = new_status;
    proposal.updated_at = clock.unix_timestamp;
    
    // If opening, capture eligible voting power snapshot
    if new_status == ProposalStatus::Open {
        msg!("Proposal opened: {:?}", proposal.proposal_id);
    }
    
    // If closing, set closed timestamp (though this is typically done in commit_vote_results)
    if new_status == ProposalStatus::Closed {
        msg!("Proposal closed: {:?}", proposal.proposal_id);
    }
    
    Ok(())
}

