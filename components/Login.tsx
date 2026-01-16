
import React, { useState, useMemo } from 'react';
import { User, Job, AppConfig, KPIRow } from '../types';
import { Briefcase, User as UserIcon, Lock, LogIn, Database, SkipForward, Search, Download } from 'lucide-react';
import { getUniqueValues } from '../utils';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[]; // Used for password verification only
  data: KPIRow[]; // Used to populate dropdowns
  jobs: Job[];
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  installPrompt?: any;
  onInstall?: () => void;
}

export default function Login({ onLogin, users, data, jobs, config, setConfig, installPrompt, onInstall }: LoginProps) {
  const [roleType, setRoleType] = useState(''); // RSM, SM, ASM, SALESMANNAMEA, Staff
  const [selectedIdentity, setSelectedIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [syncUrl, setSyncUrl] = useState(config.syncUrl);
  const [mode, setMode] = useState<'login' | 'setup'>(config.syncUrl ? 'login' : 'setup');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract Lists based on Data
  const rsmList = useMemo(() => getUniqueValues(data, 'RSM'), [data]);
  const smList = useMemo(() => getUniqueValues(data, 'SM'), [data]);
  
  // ASM List (Distributors)
  const asmList = useMemo(() => getUniqueValues(data, 'Dist Name'), [data]);
  
  // Staff List (From Users Sheet)
  const staffList = useMemo(() => {
    return users
      .filter(u => u.jobTitle === 'Staff')
      .map(u => u.name || u.username);
  }, [users]);
  
  const salesmanList = useMemo(() => {
    // Unique list of Salesmen with ID
    const unique = new Map();
    data.forEach(row => {
      if (row.SALESMANNO && row.SALESMANNAMEA && !unique.has(row.SALESMANNO)) {
        unique.set(row.SALESMANNO, `${row.SALESMANNO} - ${row.SALESMANNAMEA}`);
      }
    });
    return Array.from(unique.values());
  }, [data]);

  // General Filter for Searchable Dropdowns (ASM & Salesman)
  const filteredList = useMemo(() => {
    if (!searchTerm) {
        if (roleType === 'ASM') return asmList;
        if (roleType === 'SALESMANNAMEA') return salesmanList;
        if (roleType === 'Staff') return staffList;
        return [];
    }
    const source = roleType === 'ASM' ? asmList : (roleType === 'Staff' ? staffList : salesmanList);
    // @ts-ignore
    return source.filter(s => s && s.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [asmList, salesmanList, staffList, searchTerm, roleType]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'setup') {
        if (!syncUrl) { setError('يرجى إدخال رابط الاتصال'); return; }
        setConfig({ ...config, syncUrl });
        setMode('login');
        return;
    }

    // Admin Backdoor
    if (roleType === 'Admin' && password === 'Bi522129') {
        onLogin({ username: 'Bahaa', name: 'Bahaa', role: 'admin', jobTitle: 'IT Manager' });
        return;
    }

    if (!roleType) { setError('يرجى اختيار الوظيفة'); return; }
    if (!selectedIdentity && roleType !== 'Admin') { setError('يرجى اختيار الاسم/الفرع/الكود'); return; }

    // PASSWORD & IDENTITY LOGIC
    // -------------------------
    let targetUsername = selectedIdentity;
    
    // 1. Salesman: Finds their Distributor (ASM) and uses Distributor's password
    if (roleType === 'SALESMANNAMEA') {
        const salesmanId = selectedIdentity.split(' - ')[0].trim(); // Extract ID and trim
        // Find row in Data to get Dist Name
        // FIX: Convert SALESMANNO to string to ensure matching against salesmanId (string) and ignore types (number vs string)
        const salesmanRow = data.find(r => String(r.SALESMANNO).trim() === salesmanId);
        
        if (salesmanRow && salesmanRow['Dist Name']) {
            targetUsername = salesmanRow['Dist Name']; // Authenticate against Distributor Username
        } else {
            setError('خطأ: لم يتم العثور على التوكيل التابع لهذا المندوب');
            return;
        }
    }

    // 2. ASM / Distributor: Uses their own name as username
    if (roleType === 'ASM') {
        targetUsername = selectedIdentity;
    }

    // 3. Staff: Uses their name as username (or mapped username from sheet)
    if (roleType === 'Staff') {
        // We compare against the name selected in dropdown
        targetUsername = selectedIdentity;
    }

    // 4. Find User Credential
    // Checks if there is a User in the uploaded 'users' list where username matches 'targetUsername'
    // or Name matches 'targetUsername' (for Staff/Managers)
    const validUser = users.find(u => {
        const uName = String(u.name || u.username).trim().toLowerCase();
        const uUser = String(u.username).trim().toLowerCase();
        const target = String(targetUsername).trim().toLowerCase();
        
        return (uName === target || uUser === target) && String(u.password).trim() === String(password).trim();
    });

    // Fallback/Demo Logic (Only if not found in official users list)
    // If exact credential not found, but identity exists in Data, check default password '123456'
    let isAuthenticated = false;
    let finalUserObj: User | null = null;

    if (validUser) {
        isAuthenticated = true;
        finalUserObj = validUser;
    } else if (password === '123456' && roleType !== 'Staff') {
         // Weak demo check (optional, remove in strict prod) - Disabled for Staff to enforce sheet credentials
         isAuthenticated = true;
         finalUserObj = {
             username: targetUsername,
             name: selectedIdentity,
             role: roleType === 'Admin' || roleType === 'RSM' ? 'admin' : 'user',
             jobTitle: roleType
         };
    }

    if (isAuthenticated && finalUserObj) {
        // Enforce RLS context
        const rlsContext: any = {};
        if (roleType === 'RSM') rlsContext.RSM = selectedIdentity;
        if (roleType === 'SM') rlsContext.SM = selectedIdentity;
        if (roleType === 'ASM') rlsContext['Dist Name'] = selectedIdentity;
        
        // Define Job Title (Override for Salesman to 'DSF')
        let displayJobTitle = finalUserObj.jobTitle;

        if (roleType === 'SALESMANNAMEA') {
             const salesmanId = selectedIdentity.split(' - ')[0].trim();
             rlsContext.SALESMANNO = salesmanId;
             displayJobTitle = 'DSF'; // Force DSF title for salesmen
        }
        // Staff has no RLS (sees all), handled in App.tsx

        // Pass combined user info with updated jobTitle
        onLogin({ ...finalUserObj, ...rlsContext, name: selectedIdentity, jobTitle: displayJobTitle });
    } else {
        setError('كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
        
        {/* Header Section with Logo */}
        <div className="text-center mb-6 relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">EVPM</h2>
            <p className="text-blue-600 font-bold text-[10px] uppercase tracking-[0.3em]">بوابة الأداء الذكية</p>
        </div>

        {/* INSTALL BUTTON (Only visible if prompted) */}
        {installPrompt && (
            <div className="mb-6 animate-pulse">
                <button 
                    type="button" 
                    onClick={onInstall} 
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 p-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                    <Download size={20} />
                    <span className="font-black text-sm">تثبيت التطبيق</span>
                </button>
                <p className="text-[9px] text-center text-emerald-500 mt-1 font-bold">اضغط هنا لتثبيت التطبيق على جهازك</p>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            {mode === 'setup' ? (
                <div className="animate-fade-in-up">
                    <label className="text-xs font-black text-slate-500 mb-2 block text-right">رابط الاتصال (Script URL)</label>
                    <div className="relative">
                        <input type="text" required value={syncUrl} onChange={e => setSyncUrl(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none transition-all" placeholder="https://script.google.com/..." />
                        <Database className="absolute right-3 top-3.5 text-slate-400" size={18} />
                    </div>
                </div>
            ) : (
                <>
                    {/* 1. Select Job Role */}
                    <div>
                         <label className="text-[10px] font-black text-slate-400 mb-1 block text-right uppercase">الوظيفة</label>
                         <div className="relative">
                            <select 
                                value={roleType} 
                                onChange={e => { setRoleType(e.target.value); setSelectedIdentity(''); setSearchTerm(''); }} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold text-slate-700 transition-all"
                            >
                                <option value="">اختر الوظيفة</option>
                                <option value="RSM">RSM (Regional Manager)</option>
                                <option value="SM">SM (Sales Manager)</option>
                                <option value="ASM">ASM / Distributor</option>
                                <option value="SALESMANNAMEA">Sales Representative</option>
                                <option value="Staff">موظف (Staff)</option>
                                <option value="Admin">System Administrator</option>
                            </select>
                            <Briefcase className="absolute right-3 top-3.5 text-slate-400" size={18} />
                         </div>
                    </div>

                    {/* 2. Dynamic Identity Selection based on Role */}
                    {roleType && roleType !== 'Admin' && (
                        <div className="animate-fade-in-up">
                             <label className="text-[10px] font-black text-slate-400 mb-1 block text-right uppercase">
                                {roleType === 'RSM' ? 'اسم المدير الإقليمي' : 
                                 roleType === 'SM' ? 'اسم مدير المبيعات' : 
                                 roleType === 'ASM' ? 'اسم الفرع / الموزع' : 
                                 roleType === 'Staff' ? 'اسم الموظف' : 'كود / اسم المندوب'}
                             </label>
                             
                             <div className="relative">
                                {(roleType === 'SALESMANNAMEA' || roleType === 'ASM' || roleType === 'Staff') ? (
                                    // Searchable Dropdown for Salesman OR ASM OR Staff
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="بحث..."
                                            value={selectedIdentity ? selectedIdentity : searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); setSelectedIdentity(''); }}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none font-bold text-sm"
                                        />
                                        <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
                                        {searchTerm && !selectedIdentity && (
                                            <div className="absolute z-50 w-full bg-white shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto border border-slate-100">
                                                {filteredList.map(s => (
                                                    <div 
                                                        key={s} 
                                                        onClick={() => { setSelectedIdentity(s); setSearchTerm(''); }}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer text-right text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0"
                                                    >
                                                        {s}
                                                    </div>
                                                ))}
                                                {filteredList.length === 0 && <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج</div>}
                                            </div>
                                        )}
                                        {selectedIdentity && (
                                            <button 
                                                type="button"
                                                onClick={() => { setSelectedIdentity(''); setSearchTerm(''); }}
                                                className="absolute left-3 top-3 text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                                            >
                                                تغيير
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    // Standard Dropdown for Managers
                                    <>
                                        <select 
                                            value={selectedIdentity} 
                                            onChange={e => setSelectedIdentity(e.target.value)} 
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold text-slate-700"
                                        >
                                            <option value="">اختر من القائمة</option>
                                            {(roleType === 'RSM' ? rsmList : smList).map(item => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                        <UserIcon className="absolute right-3 top-3.5 text-slate-400" size={18} />
                                    </>
                                )}
                             </div>
                        </div>
                    )}

                    {/* 3. Password Field */}
                    <div>
                         <label className="text-[10px] font-black text-slate-400 mb-1 block text-right uppercase">كلمة المرور</label>
                         <div className="relative">
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none transition-all" />
                            <Lock className="absolute right-3 top-3.5 text-slate-400" size={18} />
                         </div>
                    </div>
                </>
            )}

            {error && <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full"></div>{error}</div>}

            <button type="submit" className="w-full bg-gradient-to-l from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 transform active:scale-95">
                {mode === 'setup' ? 'اتصال بالنظام' : 'تسجيل الدخول'} <LogIn size={18} />
            </button>
            
            {mode === 'login' ? (
                <div className="flex justify-between items-center pt-2">
                    <button type="button" onClick={() => setMode('setup')} className="text-slate-400 text-[10px] font-bold hover:text-blue-500">إعدادات الاتصال</button>
                    {data.length === 0 && (
                        <span className="text-[10px] text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded">No Data Loaded</span>
                    )}
                </div>
            ) : (
                <button type="button" onClick={() => setMode('login')} className="w-full text-center text-slate-400 text-[10px] font-bold hover:text-blue-500 flex items-center justify-center gap-1">
                   تخطي <SkipForward size={12}/>
                </button>
            )}
        </form>
      </div>
    </div>
  );
}
