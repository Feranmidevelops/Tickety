namespace Tickety.Domain.Entities;

/// <summary>A pending invitation. Admin creates one per staff email; accepting it creates the user.</summary>
public class Invite
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;

    /// <summary>Role the invited user will be granted (see <see cref="Roles"/>).</summary>
    public string Role { get; set; } = null!;

    /// <summary>Opaque single-use token embedded in the accept link.</summary>
    public string Token { get; set; } = null!;

    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? AcceptedAtUtc { get; set; }
    public string CreatedByUserId { get; set; } = null!;
    public DateTime CreatedAtUtc { get; set; }

    public bool IsUsable(DateTime nowUtc) => AcceptedAtUtc is null && ExpiresAtUtc > nowUtc;
}
