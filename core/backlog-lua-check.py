"""Execute production Lua mutation scripts against a deterministic Redis command stub."""
import ctypes,re,pathlib
lib=ctypes.CDLL('liblua5.4.so.0');lib.luaL_newstate.restype=ctypes.c_void_p;lib.luaL_openlibs.argtypes=[ctypes.c_void_p];lib.luaL_loadstring.argtypes=[ctypes.c_void_p,ctypes.c_char_p];lib.lua_pcallk.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_longlong,ctypes.c_void_p];lib.lua_tolstring.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_void_p];lib.lua_tolstring.restype=ctypes.c_char_p;lib.lua_close.argtypes=[ctypes.c_void_p]
source=(pathlib.Path(__file__).parents[1]/'api/vue-backlog.js').read_text();scripts={k:re.search(r'const '+k+r'=`(.*?)`;',source,re.S)[1] for k in ['proposeScript','voteScript','statusScript']}
harness='''
local db={}; cjson={encode=function(v)return v end,decode=function(v)return v end}
redis={call=function(command,key,a,b)
 if command=='HGET' then return db[key] and db[key][a] end
 if command=='HSET' then db[key]=db[key] or {}; db[key][a]=b; return 1 end
 if command=='HLEN' then local n=0; for _ in pairs(db[key] or {})do n=n+1 end; return n end
 if command=='INCR' then db[key]=(db[key] or 0)+1; return db[key] end
 if command=='EXPIRE' then return 1 end
 if command=='SISMEMBER' then return db[key] and db[key][a] and 1 or 0 end
 if command=='SADD' then db[key]=db[key] or {}; db[key][a]=true; return 1 end
 if command=='SREM' then if db[key] then db[key][a]=nil end; return 1 end
 error('Unsupported Redis command '..command)
end}
'''
for name,script in scripts.items():harness+='local '+name+'=function()\n'+script+'\nend\n'
harness+='''
KEYS={'backlog','rate:memberA'}; ARGV={'BOOKVUE',{name='BOOKVUE',votes=0,status='proposed'}}
assert(proposeScript()=='created'); assert(proposeScript()=='duplicate'); assert(db.backlog.BOOKVUE.votes==0)
KEYS={'backlog','voters:BOOKVUE'}; ARGV={'BOOKVUE','memberA'}
local first=voteScript(); assert(first.voted==true and first.votes==1)
local second=voteScript(); assert(second.voted==false and second.votes==0)
ARGV={'BOOKVUE','memberB'}; assert(voteScript().votes==1)
ARGV={'BOOKVUE','memberA'}; assert(voteScript().votes==2)
ARGV={'BOOKVUE','memberB'}; assert(voteScript().votes==1)
KEYS={'backlog'}; ARGV={'BOOKVUE','building','today'}; assert(statusScript()=='updated')
KEYS={'backlog','voters:BOOKVUE'}; ARGV={'BOOKVUE','memberC'}; assert(voteScript()=='closed'); assert(db.backlog.BOOKVUE.votes==1)
ARGV={'MISSINGVUE','memberA'}; assert(voteScript()=='missing')
for n=1,4 do KEYS={'backlog','rate:memberA'}; ARGV={'NAME'..n..'VUE',{votes=0,status='proposed'}}; assert(proposeScript()=='created') end
ARGV={'LIMITVUE',{votes=0,status='proposed'}}; assert(proposeScript()=='limit'); assert(db.backlog.LIMITVUE==nil)
KEYS={'backlog','rate:memberB'}; assert(proposeScript()=='created')
'''
state=lib.luaL_newstate();lib.luaL_openlibs(state)
try:
 code=lib.luaL_loadstring(state,harness.encode()) or lib.lua_pcallk(state,0,0,0,0,None)
 if code:raise RuntimeError(lib.lua_tolstring(state,-1,None).decode())
 print('Production Lua passed: independent members, vote withdrawal, closed states, duplicates and proposal rate limit.')
finally:lib.lua_close(state)
