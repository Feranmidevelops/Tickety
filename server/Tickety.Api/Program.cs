using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Tickety.Api.Auth;
using Tickety.Api.Endpoints;
using Tickety.Api.Realtime;
using Tickety.Domain;
using Tickety.Infrastructure.Data;
using Tickety.Infrastructure.Email;
using Tickety.Infrastructure.Identity;

var builder = WebApplication.CreateBuilder(args);

// —— Bind to the platform-provided port (Render/Koyeb/etc. inject PORT). Locally, PORT is
// unset so the Dockerfile's ASPNETCORE_URLS / launch settings apply. ——
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// —— JSON: serialize enums as strings so the TS client gets "InProgress", not 1 ——
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// —— Persistence (PostgreSQL / Supabase) ——
// Treat DateTime as timestamp-without-tz (matches our UTC-everywhere model and the prior SQL Server
// behaviour), avoiding Npgsql's strict Kind=Utc enforcement on writes.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// —— Identity ——
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(o =>
    {
        // Password policy — mirrored exactly by the client-side checklist on the accept-invite page,
        // so what the user sees ticking green is precisely what the server enforces.
        o.Password.RequiredLength = 8;
        o.Password.RequireUppercase = true;        // one capital letter
        o.Password.RequireDigit = true;            // one number
        o.Password.RequireNonAlphanumeric = true;  // one special character
        o.Password.RequireLowercase = false;       // not required (kept in step with the UI checklist)
        o.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// —— Auth: JWT bearer, with the SignalR access_token handshake shim ——
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
jwt.Key ??= builder.Configuration["Jwt:Key"]!;
builder.Services.AddSingleton(jwt);
builder.Services.AddScoped<JwtTokenService>();

builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwt.Issuer,
        ValidAudience = jwt.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key))
    };

    // SignalR sends the token in the query string on the WebSocket handshake — lift it into context.
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var accessToken = ctx.Request.Query["access_token"];
            var path = ctx.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                ctx.Token = accessToken;
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// —— Rate limiting: throttle login attempts per client IP to blunt brute-force guessing ——
builder.Services.AddRateLimiter(o =>
{
    o.AddPolicy("login", httpContext =>
    {
        // Prefer the real client IP behind Render's proxy (X-Forwarded-For), else the socket IP.
        var ip = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
        if (string.IsNullOrEmpty(ip))
            ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 8,
            Window = TimeSpan.FromSeconds(30),
            QueueLimit = 0,
        });
    });
    o.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Too many attempts. Please wait a moment and try again." }, ct);
    };
});

// —— CORS for the Vite dev client ——
var clientUrl = builder.Configuration["ClientUrl"] ?? "http://localhost:5173";
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(clientUrl)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// Match the HTTP JSON contract (camelCase + string enums) so pushed payloads
// deserialize into the same client types as REST responses.
builder.Services.AddSignalR().AddJsonProtocol(o =>
{
    o.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddSingleton<IPresenceTracker, PresenceTracker>();
builder.Services.AddEmailSender(builder.Configuration);
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

// Apply migrations and seed roles/admin on startup, in every environment.
await DbSeeder.SeedAsync(app.Services, app.Environment.IsDevelopment());

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapInviteEndpoints();
app.MapTicketEndpoints();
app.MapAgentEndpoints();
app.MapUsersEndpoints();
app.MapNotificationsEndpoints();

app.MapHub<QueueHub>("/hubs/queue");
app.MapHub<TicketHub>("/hubs/ticket");
app.MapHub<PresenceHub>("/hubs/presence");

// Lightweight liveness probe (Swagger is Development-only) for platform health checks.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
