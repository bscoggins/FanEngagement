using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Mfa;
using FanEngagement.Application.Users;
using FanEngagement.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class MfaTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public MfaTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task MfaSetup_ReturnsSetupResult_ForAdminUser()
    {
        // Arrange - Create admin user and get token
        var (token, _) = await CreateAdminUserAndLoginAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.PostAsync("/users/me/mfa/setup", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var setupResult = await response.Content.ReadFromJsonAsync<MfaSetupResult>();
        Assert.NotNull(setupResult);
        Assert.NotEmpty(setupResult!.SecretKey);
        Assert.NotEmpty(setupResult.QrCodeUri);
        Assert.NotNull(setupResult.BackupCodes);
        Assert.Equal(10, setupResult.BackupCodes.Length);
        Assert.Contains("otpauth://totp/", setupResult.QrCodeUri);
    }

    [Fact]
    public async Task MfaEnable_EnablesMfa_WithValidTotpCode()
    {
        // Arrange
        var (token, _) = await CreateAdminUserAndLoginAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Setup MFA
        var setupResponse = await _client.PostAsync("/users/me/mfa/setup", null);
        var setupResult = await setupResponse.Content.ReadFromJsonAsync<MfaSetupResult>();
        Assert.NotNull(setupResult);

        // Generate a valid TOTP code
        string validCode;
        using (var scope = _factory.Services.CreateScope())
        {
            var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();
            validCode = GenerateCurrentTotp(setupResult!.SecretKey, mfaService);
        }

        var enableRequest = new MfaEnableRequest
        {
            SecretKey = setupResult!.SecretKey,
            TotpCode = validCode
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users/me/mfa/enable", enableRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<dynamic>();
        Assert.NotNull(result);

        // Verify MFA is enabled
        var statusResponse = await _client.GetAsync("/users/me/mfa/status");
        var status = await statusResponse.Content.ReadFromJsonAsync<Dictionary<string, bool>>();
        Assert.True(status!["mfaEnabled"]);
    }

    [Fact]
    public async Task MfaEnable_Fails_WithInvalidTotpCode()
    {
        // Arrange
        var (token, _) = await CreateAdminUserAndLoginAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var setupResponse = await _client.PostAsync("/users/me/mfa/setup", null);
        var setupResult = await setupResponse.Content.ReadFromJsonAsync<MfaSetupResult>();

        var enableRequest = new MfaEnableRequest
        {
            SecretKey = setupResult!.SecretKey,
            TotpCode = "000000" // Invalid code
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users/me/mfa/enable", enableRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_RequiresMfa_WhenMfaEnabled()
    {
        // Arrange - Create admin user directly with known credentials
        var password = "TestPassword123!";
        var email = $"admin-{Guid.NewGuid()}@example.com";
        
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagement.Infrastructure.Persistence.FanEngagementDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<FanEngagement.Application.Authentication.IAuthService>();
        var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();

        var adminUser = new FanEngagement.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = "Admin User",
            PasswordHash = authService.HashPassword(password),
            Role = FanEngagement.Domain.Enums.UserRole.Admin,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Users.Add(adminUser);
        await dbContext.SaveChangesAsync();

        // Login to get token
        var loginRequest = new LoginRequest { Email = email, Password = password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResult!.Token);

        // Enable MFA
        var setupResponse = await _client.PostAsync("/users/me/mfa/setup", null);
        var setupResult = await setupResponse.Content.ReadFromJsonAsync<MfaSetupResult>();
        var validCode = GenerateCurrentTotp(setupResult!.SecretKey, mfaService);

        await _client.PostAsJsonAsync("/users/me/mfa/enable", new MfaEnableRequest
        {
            SecretKey = setupResult.SecretKey,
            TotpCode = validCode
        });

        // Clear auth header for login test
        _client.DefaultRequestHeaders.Authorization = null;

        // Act - Try to login
        var loginRequest2 = new LoginRequest { Email = email, Password = password };
        var loginResponse2 = await _client.PostAsJsonAsync("/auth/login", loginRequest2);

        // Assert
        Assert.Equal(HttpStatusCode.OK, loginResponse2.StatusCode);
        var loginResult2 = await loginResponse2.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginResult2);
        Assert.True(loginResult2!.MfaRequired);
        Assert.Empty(loginResult2.Token); // Should not have a token yet
    }

    [Fact]
    public async Task MfaValidate_ReturnsToken_WithValidTotpCode()
    {
        // Arrange - Create admin user with MFA enabled
        var password = "TestPassword123!";
        var email = $"admin-{Guid.NewGuid()}@example.com";
        var secretKey = await CreateAdminWithMfaAsync(email, password);

        // Login (will require MFA)
        _client.DefaultRequestHeaders.Authorization = null;
        var loginRequest = new LoginRequest { Email = email, Password = password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        // Generate valid TOTP code
        string validCode;
        using (var scope = _factory.Services.CreateScope())
        {
            var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();
            validCode = GenerateCurrentTotp(secretKey, mfaService);
        }

        var validateRequest = new MfaValidateRequest
        {
            UserId = loginResult!.UserId,
            Code = validCode
        };

        // Act
        var validateResponse = await _client.PostAsJsonAsync("/auth/mfa/validate", validateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, validateResponse.StatusCode);
        var validateResult = await validateResponse.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(validateResult);
        Assert.NotEmpty(validateResult!.Token);
        Assert.False(validateResult.MfaRequired);
    }

    [Fact]
    public async Task MfaValidate_Fails_WithInvalidCode()
    {
        // Arrange
        var password = "TestPassword123!";
        var email = $"admin-{Guid.NewGuid()}@example.com";
        await CreateAdminWithMfaAsync(email, password);

        _client.DefaultRequestHeaders.Authorization = null;
        var loginRequest = new LoginRequest { Email = email, Password = password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        var validateRequest = new MfaValidateRequest
        {
            UserId = loginResult!.UserId,
            Code = "000000" // Invalid code
        };

        // Act
        var validateResponse = await _client.PostAsJsonAsync("/auth/mfa/validate", validateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, validateResponse.StatusCode);
    }

    [Fact]
    public async Task MfaValidate_AcceptsBackupCode()
    {
        // Arrange - Create admin user with MFA enabled
        var password = "TestPassword123!";
        var email = $"admin-{Guid.NewGuid()}@example.com";
        var (_, backupCodes) = await CreateAdminWithMfaAndGetBackupCodesAsync(email, password);

        // Login (will require MFA)
        _client.DefaultRequestHeaders.Authorization = null;
        var loginRequest = new LoginRequest { Email = email, Password = password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        var validateRequest = new MfaValidateRequest
        {
            UserId = loginResult!.UserId,
            Code = backupCodes[0] // Use first backup code
        };

        // Act
        var validateResponse = await _client.PostAsJsonAsync("/auth/mfa/validate", validateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, validateResponse.StatusCode);
        var validateResult = await validateResponse.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(validateResult);
        Assert.NotEmpty(validateResult!.Token);
    }

    [Fact]
    public async Task MfaDisable_DisablesMfa_WithValidCode()
    {
        // Arrange - Create admin user with MFA enabled
        var password = "TestPassword123!";
        var email = $"admin-{Guid.NewGuid()}@example.com";
        var secretKey = await CreateAdminWithMfaAsync(email, password);

        // Login with MFA
        var token = await LoginWithMfaAsync(email, password, secretKey);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Generate valid TOTP code for disable
        string validCode;
        using (var scope = _factory.Services.CreateScope())
        {
            var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();
            validCode = GenerateCurrentTotp(secretKey, mfaService);
        }

        var disableRequest = new MfaDisableRequest { Code = validCode };

        // Act
        var response = await _client.PostAsJsonAsync("/users/me/mfa/disable", disableRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify MFA is disabled
        var statusResponse = await _client.GetAsync("/users/me/mfa/status");
        var status = await statusResponse.Content.ReadFromJsonAsync<Dictionary<string, bool>>();
        Assert.False(status!["mfaEnabled"]);
    }

    [Fact]
    public async Task TotpMfaService_ValidatesTotp_WithCorrectCode()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();
        var setupResult = mfaService.GenerateSetup(Guid.NewGuid(), "test@example.com");
        var validCode = GenerateCurrentTotp(setupResult.SecretKey, mfaService);

        // Act
        var isValid = mfaService.ValidateTotp(setupResult.SecretKey, validCode);

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public async Task TotpMfaService_RejectsInvalidCode()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();
        var setupResult = mfaService.GenerateSetup(Guid.NewGuid(), "test@example.com");

        // Act
        var isValid = mfaService.ValidateTotp(setupResult.SecretKey, "000000");

        // Assert
        Assert.False(isValid);
    }

    [Fact]
    public async Task TotpMfaService_GeneratesBackupCodes()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();

        // Act
        var backupCodes = mfaService.GenerateBackupCodes();

        // Assert
        Assert.NotNull(backupCodes);
        Assert.Equal(10, backupCodes.Length);
        Assert.All(backupCodes, code => Assert.Equal(8, code.Length));
    }

    [Fact]
    public async Task TotpMfaService_ValidatesBackupCode()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();
        var backupCodes = mfaService.GenerateBackupCodes();
        var hashedCodes = mfaService.HashBackupCodes(backupCodes);

        // Act
        var isValid = mfaService.ValidateBackupCode(hashedCodes, backupCodes[0]);

        // Assert
        Assert.True(isValid);
    }

    // Helper methods
    private async Task<(string token, Guid userId)> CreateAdminUserAndLoginAsync(string? email = null, string? password = null)
    {
        // Use the existing helper to create an admin user
        var (userId, token) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        return (token, userId);
    }

    private async Task<string> CreateAdminWithMfaAsync(string email, string password)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagement.Infrastructure.Persistence.FanEngagementDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<FanEngagement.Application.Authentication.IAuthService>();
        var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();

        var adminUser = new FanEngagement.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = "Admin User",
            PasswordHash = authService.HashPassword(password),
            Role = FanEngagement.Domain.Enums.UserRole.Admin,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Users.Add(adminUser);
        await dbContext.SaveChangesAsync();

        // Login to get token
        var loginRequest = new LoginRequest { Email = email, Password = password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResult!.Token);

        // Enable MFA
        var setupResponse = await _client.PostAsync("/users/me/mfa/setup", null);
        var setupResult = await setupResponse.Content.ReadFromJsonAsync<MfaSetupResult>();
        var validCode = GenerateCurrentTotp(setupResult!.SecretKey, mfaService);

        await _client.PostAsJsonAsync("/users/me/mfa/enable", new MfaEnableRequest
        {
            SecretKey = setupResult.SecretKey,
            TotpCode = validCode
        });

        return setupResult.SecretKey;
    }

    private async Task<(string secretKey, string[] backupCodes)> CreateAdminWithMfaAndGetBackupCodesAsync(string email, string password)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagement.Infrastructure.Persistence.FanEngagementDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<FanEngagement.Application.Authentication.IAuthService>();
        var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();

        var adminUser = new FanEngagement.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = "Admin User",
            PasswordHash = authService.HashPassword(password),
            Role = FanEngagement.Domain.Enums.UserRole.Admin,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Users.Add(adminUser);
        await dbContext.SaveChangesAsync();

        // Login to get token
        var loginRequest = new LoginRequest { Email = email, Password = password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResult!.Token);

        // Enable MFA and get backup codes
        var setupResponse = await _client.PostAsync("/users/me/mfa/setup", null);
        var setupResult = await setupResponse.Content.ReadFromJsonAsync<MfaSetupResult>();
        var validCode = GenerateCurrentTotp(setupResult!.SecretKey, mfaService);

        var enableResponse = await _client.PostAsJsonAsync("/users/me/mfa/enable", new MfaEnableRequest
        {
            SecretKey = setupResult.SecretKey,
            TotpCode = validCode
        });
        var enableResult = await enableResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        var backupCodesJson = enableResult!["backupCodes"].ToString();
        var backupCodes = System.Text.Json.JsonSerializer.Deserialize<string[]>(backupCodesJson!);

        return (setupResult.SecretKey, backupCodes!);
    }

    private async Task<string> LoginWithMfaAsync(string email, string password, string secretKey)
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var loginRequest = new LoginRequest { Email = email, Password = password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        string validCode;
        using (var scope = _factory.Services.CreateScope())
        {
            var mfaService = scope.ServiceProvider.GetRequiredService<IMfaService>();
            validCode = GenerateCurrentTotp(secretKey, mfaService);
        }

        var validateRequest = new MfaValidateRequest
        {
            UserId = loginResult!.UserId,
            Code = validCode
        };

        var validateResponse = await _client.PostAsJsonAsync("/auth/mfa/validate", validateRequest);
        var validateResult = await validateResponse.Content.ReadFromJsonAsync<LoginResponse>();

        return validateResult!.Token;
    }

    private string GenerateCurrentTotp(string secretKey, IMfaService mfaService)
    {
        // Use the actual service to generate a valid code
        var secretBytes = OtpNet.Base32Encoding.ToBytes(secretKey);
        var totp = new OtpNet.Totp(secretBytes);
        return totp.ComputeTotp();
    }
}
