using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Tickety.Infrastructure.Email;

public static class EmailServiceCollectionExtensions
{
    /// <summary>Binds the "Email" config section and registers an SMTP sender when enabled and
    /// credentials are present; otherwise a no-op sender so the app still runs without mail set up.</summary>
    public static IServiceCollection AddEmailSender(this IServiceCollection services, IConfiguration config)
    {
        var options = config.GetSection("Email").Get<EmailOptions>() ?? new EmailOptions();
        services.AddSingleton(options);

        var configured = options.Enabled
            && !string.IsNullOrWhiteSpace(options.Username)
            && !string.IsNullOrWhiteSpace(options.Password);

        if (configured)
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        else
            services.AddScoped<IEmailSender, NoOpEmailSender>();

        return services;
    }
}
