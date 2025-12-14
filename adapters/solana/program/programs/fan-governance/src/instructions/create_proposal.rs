use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(
    proposal_id: [u8; 16],
    organization_id: [u8; 16],
    title: String,
    content_hash: [u8; 32],
    start_at: Option<i64>,
    end_at: Option<i64>,
    eligible_voting_power: u64,
    quorum_requirement: Option<u16>
)]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProposalAccount::LEN,
        seeds = [
            b"proposal",
            organization.key().as_ref(),
            &proposal_id
        ],
        bump
    )]
    pub proposal: Account<'info, ProposalAccount>,
    
    #[account(
        mut,
        seeds = [
            b"organization",
            &organization_id
        ],
        bump = organization.bump,
        constraint = organization.organization_id == organization_id @ GovernanceError::OrganizationNotFound,
        constraint = organization.authority == authority.key() @ GovernanceError::Unauthorized
    )]
    pub organization: Account<'info, OrganizationAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateProposal>,
    proposal_id: [u8; 16],
    organization_id: [u8; 16],
    title: String,
    content_hash: [u8; 32],
    start_at: Option<i64>,
    end_at: Option<i64>,
    eligible_voting_power: u64,
    quorum_requirement: Option<u16>,
) -> Result<()> {
    // Validate title length
    require!(
        title.len() <= ProposalAccount::MAX_TITLE_LENGTH,
        GovernanceError::TitleTooLong
    );
    
    // Validate quorum requirement
    if let Some(quorum) = quorum_requirement {
        require!(
            quorum <= ProposalAccount::MAX_QUORUM,
            GovernanceError::InvalidQuorumRequirement
        );
    }
    
    // Validate time range
    if let (Some(start), Some(end)) = (start_at, end_at) {
        require!(
            start < end,
            GovernanceError::InvalidTimeRange
        );
    }
    
    let proposal = &mut ctx.accounts.proposal;
    let organization = &mut ctx.accounts.organization;
    let clock = Clock::get()?;
    
    proposal.proposal_id = proposal_id;
    proposal.organization_id = organization_id;
    proposal.title = title;
    proposal.content_hash = content_hash;
    proposal.status = ProposalStatus::Draft;
    proposal.start_at = start_at;
    proposal.end_at = end_at;
    proposal.eligible_voting_power = eligible_voting_power;
    proposal.quorum_requirement = quorum_requirement;
    proposal.created_by = ctx.accounts.authority.key();
    proposal.created_at = clock.unix_timestamp;
    proposal.updated_at = clock.unix_timestamp;
    proposal.bump = ctx.bumps.proposal;
    
    // Increment organization proposal count
    organization.proposal_count = organization.proposal_count.checked_add(1)
        .ok_or(GovernanceError::InvalidStateTransition)?;
    
    msg!("Proposal created: {:?}", proposal_id);
    
    Ok(())
}

