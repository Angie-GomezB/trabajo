using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace orca.Code.Auth {
    public class ApplicationUser : IdentityUser {
        public string ApplicationId { get; set; } = "";
    }
    public class ApplicationRole : IdentityRole {
        public string ApplicationId { get; set; } = "";
    }
    public class ApplicationUserValidator : IUserValidator<ApplicationUser> {
        public async Task<IdentityResult> ValidateAsync(UserManager<ApplicationUser> manager, ApplicationUser user) {
            return IdentityResult.Success;
            //ApplicationUser iuser = await manager.Users.Where(euser => euser.NormalizedUserName == user.NormalizedUserName && euser.ApplicationId == user.ApplicationId).FirstOrDefaultAsync();
            //IdentityResult result;
            //if (iuser == null)
            //    result = IdentityResult.Success;
            //else result = IdentityResult.Failed(
            //    new IdentityError { Code = "Duplicate", Description = "Username '" + user.UserName + "' is already taken." });
            //return result;
        }
    }
    public class ApplicationUserManager : UserManager<ApplicationUser> {
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDBContext _context;
        public static string AuthAppId { get; private set; } = orca.ConfigurationManager.AppSetting["AuthAppId"];
        public ApplicationUserManager(
            IUserStore<ApplicationUser> store,
            IOptions<IdentityOptions> optionsAccessor,
            IPasswordHasher<ApplicationUser> passwordHasher,
            IEnumerable<IUserValidator<ApplicationUser>> userValidators,
            IEnumerable<IPasswordValidator<ApplicationUser>> passwordValidators,
            ILookupNormalizer keyNormalizer,
            IdentityErrorDescriber errors,
            IServiceProvider services,
            ILogger<UserManager<ApplicationUser>> logger,
            IHttpContextAccessor httpContextAccessor, 
            RoleManager<ApplicationRole> roleManager,
            AuthDBContext context) 
            : base(store, optionsAccessor, passwordHasher, userValidators, passwordValidators, keyNormalizer, errors, services, logger) {
            _roleManager = roleManager;
            _context = context;

        }
        // This is the method AddToRoleAsync calls internally
        public override async Task<IdentityResult> AddToRoleAsync(ApplicationUser user, string roleName) {
            ThrowIfDisposed();
            ArgumentNullException.ThrowIfNull(user);

            var roleEntity = await _roleManager.Roles.FirstOrDefaultAsync(r =>
                r.NormalizedName == _roleManager.NormalizeKey(roleName) && r.ApplicationId == AuthAppId);
            if (roleEntity == null) {
                return IdentityResult.Failed(ErrorDescriber.InvalidRoleName(roleName));
            }
            var userRoleExists = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == roleEntity.Id);

            if (userRoleExists) {
                return IdentityResult.Success;
            }
            _context.UserRoles.Add(new IdentityUserRole<string> {
                UserId = user.Id,
                RoleId = roleEntity.Id
            });
            try {
                await _context.SaveChangesAsync();
                return IdentityResult.Success;
            } catch (Exception ex) {
                return IdentityResult.Failed(new IdentityError {
                    Code = "DatabaseError",
                    Description = ex.Message
                });
            }
        }

    }
}
