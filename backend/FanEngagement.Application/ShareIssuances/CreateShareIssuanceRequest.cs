namespace FanEngagement.Application.ShareIssuances;

public class CreateShareIssuanceRequest
{
    public Guid UserId { get; set; }
    public Guid ShareTypeId { get; set; }
    public decimal Quantity { get; set; }
    public string? Reason { get; set; }
}
