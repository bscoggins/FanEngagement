namespace FanEngagement.Application.Common;

/// <summary>
/// Represents a paginated result containing items and pagination metadata
/// </summary>
/// <typeparam name="T">The type of items in the result</typeparam>
public sealed class PagedResult<T>
{
    /// <summary>
    /// The items in the current page
    /// </summary>
    public required IReadOnlyList<T> Items { get; init; }

    /// <summary>
    /// The total number of items across all pages
    /// </summary>
    public required int TotalCount { get; init; }

    /// <summary>
    /// The current page number (1-based)
    /// </summary>
    public required int Page { get; init; }

    /// <summary>
    /// The number of items per page
    /// </summary>
    public required int PageSize { get; init; }

    /// <summary>
    /// The total number of pages
    /// </summary>
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;

    /// <summary>
    /// Whether there is a previous page
    /// </summary>
    public bool HasPreviousPage => Page > 1;

    /// <summary>
    /// Whether there is a next page
    /// </summary>
    public bool HasNextPage => Page < TotalPages;
}
