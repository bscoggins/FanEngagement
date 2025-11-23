using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Services;
using Xunit;

namespace FanEngagement.Tests;

public class VotingPowerCalculatorTests
{
    private readonly VotingPowerCalculator _calculator;

    public VotingPowerCalculatorTests()
    {
        _calculator = new VotingPowerCalculator();
    }

    [Fact]
    public void CalculateVotingPower_WithSingleShareType_ReturnsCorrectPower()
    {
        // Arrange
        var shareType = new ShareType { Id = Guid.NewGuid(), VotingWeight = 1.0m };
        var balances = new List<ShareBalance>
        {
            new() { Id = Guid.NewGuid(), ShareTypeId = shareType.Id, Balance = 100m, ShareType = shareType }
        };

        // Act
        var votingPower = _calculator.CalculateVotingPower(balances);

        // Assert
        Assert.Equal(100m, votingPower); // 100 * 1.0
    }

    [Fact]
    public void CalculateVotingPower_WithMultipleShareTypes_ReturnsSumOfPowers()
    {
        // Arrange
        var shareType1 = new ShareType { Id = Guid.NewGuid(), VotingWeight = 1.0m };
        var shareType2 = new ShareType { Id = Guid.NewGuid(), VotingWeight = 2.0m };
        var balances = new List<ShareBalance>
        {
            new() { Id = Guid.NewGuid(), Balance = 100m, ShareType = shareType1 },
            new() { Id = Guid.NewGuid(), Balance = 50m, ShareType = shareType2 }
        };

        // Act
        var votingPower = _calculator.CalculateVotingPower(balances);

        // Assert
        Assert.Equal(200m, votingPower); // (100 * 1.0) + (50 * 2.0)
    }

    [Fact]
    public void CalculateVotingPower_WithZeroBalance_ReturnsZero()
    {
        // Arrange
        var shareType = new ShareType { Id = Guid.NewGuid(), VotingWeight = 1.0m };
        var balances = new List<ShareBalance>
        {
            new() { Id = Guid.NewGuid(), Balance = 0m, ShareType = shareType }
        };

        // Act
        var votingPower = _calculator.CalculateVotingPower(balances);

        // Assert
        Assert.Equal(0m, votingPower);
    }

    [Fact]
    public void CalculateVotingPower_WithNoBalances_ReturnsZero()
    {
        // Arrange
        var balances = new List<ShareBalance>();

        // Act
        var votingPower = _calculator.CalculateVotingPower(balances);

        // Assert
        Assert.Equal(0m, votingPower);
    }

    [Fact]
    public void CalculateVotingPower_WithZeroVotingWeight_ReturnsZero()
    {
        // Arrange
        var shareType = new ShareType { Id = Guid.NewGuid(), VotingWeight = 0m };
        var balances = new List<ShareBalance>
        {
            new() { Id = Guid.NewGuid(), Balance = 100m, ShareType = shareType }
        };

        // Act
        var votingPower = _calculator.CalculateVotingPower(balances);

        // Assert
        Assert.Equal(0m, votingPower);
    }

    [Fact]
    public void CalculateTotalEligibleVotingPower_WithMultipleUsers_ReturnsTotalPower()
    {
        // Arrange
        var shareType = new ShareType { Id = Guid.NewGuid(), VotingWeight = 1.0m };
        var balances = new List<ShareBalance>
        {
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Balance = 100m, ShareType = shareType },
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Balance = 50m, ShareType = shareType },
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Balance = 25m, ShareType = shareType }
        };

        // Act
        var totalPower = _calculator.CalculateTotalEligibleVotingPower(balances);

        // Assert
        Assert.Equal(175m, totalPower); // 100 + 50 + 25
    }

    [Fact]
    public void IsEligibleToVote_WithPositivePower_ReturnsTrue()
    {
        // Act & Assert
        Assert.True(_calculator.IsEligibleToVote(1m));
        Assert.True(_calculator.IsEligibleToVote(100m));
        Assert.True(_calculator.IsEligibleToVote(0.01m));
    }

    [Fact]
    public void IsEligibleToVote_WithZeroPower_ReturnsFalse()
    {
        // Act & Assert
        Assert.False(_calculator.IsEligibleToVote(0m));
    }

    [Fact]
    public void IsEligibleToVote_WithNegativePower_ReturnsFalse()
    {
        // Act & Assert
        Assert.False(_calculator.IsEligibleToVote(-1m));
    }
}
