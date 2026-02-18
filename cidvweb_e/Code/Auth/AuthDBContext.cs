using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace orca.Code.Auth {
    public class AuthDBContext : IdentityDbContext<ApplicationUser>, IDataProtectionKeyContext {
        public AuthDBContext(DbContextOptions<AuthDBContext> options) :
        base(options) {
            /*
                Install-Package Microsoft.EntityFrameworkCore.Tools
                Add-Migration Auth01
                Update-Database
             */
        }

        public DbSet<DataProtectionKey> DataProtectionKeys { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) {
            string cnString = orca.ConfigurationManager.AppSetting["ConnectionStrings:" + orca.ConfigurationManager.AppSetting["AuthDB"]];
            optionsBuilder.UseSqlServer(cnString);
        }
        protected override void OnModelCreating(ModelBuilder builder) {
            base.OnModelCreating(builder);

            builder.Entity<ApplicationUser>()
                .HasIndex(u => new { u.NormalizedUserName, u.ApplicationId })
                .IsUnique();

            builder.Entity<ApplicationRole>()
                .HasIndex(r => new { r.NormalizedName, r.ApplicationId })
                .IsUnique();

            var roleEntity = builder.Entity<ApplicationRole>();

            roleEntity.HasIndex(r => r.NormalizedName)
                      .HasDatabaseName("RoleNameIndex")
                      .IsUnique(false);

            // 3. Create your new Composite Unique Index
            roleEntity.HasIndex(r => new { r.NormalizedName, r.ApplicationId })
                      .HasDatabaseName("RoleAppIdIndex")
                      .IsUnique();
        }
    }
}
