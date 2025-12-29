using FanEngagement.Domain.Enums;
using FluentValidation;

namespace FanEngagement.Application.Validators;

internal static class BlockchainValidatorExtensions
{
    public static void AddBlockchainConfigValidation<T>(
        this AbstractValidator<T> validator,
        Func<T, BlockchainType?> blockchainTypeSelector,
        Func<T, string?> blockchainConfigSelector)
    {
        validator.RuleFor(x => x)
            .Custom((request, context) =>
            {
                var blockchainType = blockchainTypeSelector(request);
                var blockchainConfig = blockchainConfigSelector(request);

                if (blockchainType == BlockchainType.Polygon)
                {
                    foreach (var error in BlockchainConfigValidationHelpers.ValidatePolygonConfig(blockchainConfig))
                    {
                        context.AddFailure("BlockchainConfig", error);
                    }
                }
                else if (blockchainType == BlockchainType.Solana)
                {
                    foreach (var error in BlockchainConfigValidationHelpers.ValidateSolanaConfig(blockchainConfig))
                    {
                        context.AddFailure("BlockchainConfig", error);
                    }
                }
            });
    }
}
