use fan_governance::state::{OrganizationAccount, ProposalAccount, ProposalResultsAccount, ProposalStatus};

#[test]
fn proposal_status_matches_expected_values() {
    assert_eq!(ProposalStatus::Draft as u8, 0);
    assert_eq!(ProposalStatus::Open as u8, 1);
    assert_eq!(ProposalStatus::Closed as u8, 2);
    assert_eq!(ProposalStatus::Finalized as u8, 3);
}

#[test]
fn account_size_bounds_are_nonzero() {
    assert!(OrganizationAccount::LEN > 0);
    assert!(ProposalAccount::LEN > 0);
    assert!(ProposalResultsAccount::LEN > 0);
}

#[test]
fn max_lengths_and_quorum_bounds_are_reasonable() {
    assert!(OrganizationAccount::MAX_NAME_LENGTH >= 50);
    assert!(ProposalAccount::MAX_TITLE_LENGTH >= 100);
    // Quorum is stored as basis points (0–10000)
    assert_eq!(ProposalAccount::MAX_QUORUM, 10_000);
}
