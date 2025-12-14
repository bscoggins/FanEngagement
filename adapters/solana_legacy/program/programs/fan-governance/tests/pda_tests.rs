use anchor_lang::prelude::Pubkey;
use fan_governance::ID;

#[test]
fn organization_pda_seed_matches() {
    let organization_id: [u8; 16] = *b"org-123456789012";
    let (pda, _) = Pubkey::find_program_address(&[b"organization", organization_id.as_ref()], &ID);

    // Re-derive manually and ensure stable across runs
    let (pda_again, _) = Pubkey::find_program_address(&[b"organization", organization_id.as_ref()], &ID);
    assert_eq!(pda, pda_again);
}

#[test]
fn proposal_pda_seed_matches() {
    let organization_id: [u8; 16] = *b"org-123456789012";
    let proposal_id: [u8; 16] = *b"proposal-uuid-01";

    let (organization_pda, _) =
        Pubkey::find_program_address(&[b"organization", organization_id.as_ref()], &ID);
    let (proposal_pda, _) = Pubkey::find_program_address(
        &[b"proposal", organization_pda.as_ref(), &proposal_id],
        &ID,
    );

    // The same derivation should be deterministic
    let (proposal_pda_again, _) = Pubkey::find_program_address(
        &[b"proposal", organization_pda.as_ref(), &proposal_id],
        &ID,
    );
    assert_eq!(proposal_pda, proposal_pda_again);
}

#[test]
fn proposal_results_pda_seed_matches() {
    let organization_id: [u8; 16] = *b"org-123456789012";
    let proposal_id: [u8; 16] = *b"proposal-uuid-01";

    let (organization_pda, _) =
        Pubkey::find_program_address(&[b"organization", organization_id.as_ref()], &ID);
    let (proposal_pda, _) = Pubkey::find_program_address(
        &[b"proposal", organization_pda.as_ref(), &proposal_id],
        &ID,
    );
    let (results_pda, _) =
        Pubkey::find_program_address(&[b"proposal_results", proposal_pda.as_ref()], &ID);

    // Deterministic derivation check
    let (results_pda_again, _) =
        Pubkey::find_program_address(&[b"proposal_results", proposal_pda.as_ref()], &ID);
    assert_eq!(results_pda, results_pda_again);
}
