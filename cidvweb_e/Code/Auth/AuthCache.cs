using Microsoft.Extensions.Caching.Memory;
using System.Collections;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace experiann.Code.Auth {
    public class AuthCache {
        private MemoryCache userQueryCache;
        
        private Dictionary<string, RoleList> rolesCache;
        public AuthCache() {
            userQueryCache = new MemoryCache(new MemoryCacheOptions { SizeLimit = 500 });
            rolesCache = new Dictionary<string, RoleList>();
        }
        public void AddUserQueryCache(string user, string query) {
            string key = user + ":" + query;
            if (userQueryCache.Get(key) == null) {
                userQueryCache.Set(key, true, new MemoryCacheEntryOptions {
                    Size = 1,
                    SlidingExpiration = TimeSpan.FromHours(4)
                });
            }
        }
        public bool GetUserQueryCache(string user, string query) {
            string key = user + ":" + query;
            if (userQueryCache.Get(key) == null)
                return false;
            else
                return true;
        }
        [MethodImpl(MethodImplOptions.Synchronized)]
        public RoleList? GetRolesCache(string query, string rootPath) {
            if (rolesCache.ContainsKey(query))
                return rolesCache[query];

            string filePath = Path.Combine(rootPath, "SQL", query + ".sql");
            filePath = Path.Combine(Path.GetDirectoryName(filePath), "roles.csv");
            if (!File.Exists(filePath)) return null;

            string[] roles = File.ReadAllText(filePath).Replace("\r", "").Replace("\n", "").Split(',');

            RoleList regRoles = new RoleList();
            for (int i = 0; i < roles.Length; i++) {
                if (roles[i] == "*") regRoles.AllAccess = true;
                regRoles.Add(new Regex("^" + Regex.Escape(roles[i]).Replace("\\*", ".*") + "$", RegexOptions.Compiled | RegexOptions.IgnoreCase));
            }
            rolesCache.Add(query, regRoles);
            return regRoles;
        }

    }
    public class RoleList : IEnumerable<Regex> {
        private readonly List<Regex> _items = new();
        public bool AllAccess = false;//Esta clase existe solo por esta propiedad
        public void Add(Regex item) => _items.Add(item);
        public Regex this[int index] {
            get => _items[index];
            set => _items[index] = value;
        }
        public int Count => _items.Count;

        public IEnumerator<Regex> GetEnumerator() {
            foreach (var item in _items)
                yield return item;
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
        IEnumerator<Regex> IEnumerable<Regex>.GetEnumerator() {
            throw new NotImplementedException();
        }
    }
}
