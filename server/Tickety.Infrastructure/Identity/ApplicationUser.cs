using Microsoft.AspNetCore.Identity;

namespace Tickety.Infrastructure.Identity;

/// <summary>Application user. Kept in Infrastructure so the Domain stays persistence-ignorant;
/// domain entities reference users by their string Id.</summary>
public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}
