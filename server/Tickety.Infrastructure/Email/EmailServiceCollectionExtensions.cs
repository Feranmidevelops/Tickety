using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Tickety.Infrastructure.Email;

public static class EmailServiceCollectionExtensions
{
    /// <summary>Binds the "Email" config section and registers the sender for the configured provider:
    /// "Brevo" (HTTP API, works where SMTP is blocked) or "Smtp". Falls back to a no-op sender when
    /// email is disabled or the provider's credentials are missing, so the app always runs.</summary>
    public static IServiceCollection AddEmailSender(this IServiceCollection services, IConfiguration config)
    {
        var options = config.GetSection("Email").Get<EmailOptions>() ?? new EmailOptions();
        services.AddSingleton(options);

        if (!options.Enabled)
        {
            services.AddScoped<IEmailSender, NoOpEmailSender>();
            return services;
        }

        var from = string.IsNullOrWhiteSpace(options.FromAddress) ? options.Username : options.FromAddress;

        if (string.Equals(options.Provider, "Brevo", StringComparison.OrdinalIgnoreCase))
        {
            // Brevo needs an API key and a (verified) sender address.
            if (!string.IsNullOrWhiteSpace(options.ApiKey) && !string.IsNullOrWhiteSpace(from))
            {
                services.AddHttpClient<IEmailSender, BrevoEmailSender>(c =>
                {
                    c.BaseAddress = new Uri("https://api.brevo.com/");
                    c.Timeout = TimeSpan.FromSeconds(30);
                });
                return services;
            }
        }
        else if (!string.IsNullOrWhiteSpace(options.Username) && !string.IsNullOrWhiteSpace(options.Password))
        {
            // SMTP (e.g. Gmail) — usable locally; blocked on Render's free tier.
            services.AddScoped<IEmailSender, SmtpEmailSender>();
            return services;
        }

        services.AddScoped<IEmailSender, NoOpEmailSender>();
        return services;
    }
}
