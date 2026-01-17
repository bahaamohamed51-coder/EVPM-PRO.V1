
import React, { useState, useMemo, useEffect } from 'react';
import { PlanRow, AchievedRow, KPIRow } from '../types';
import { calculateTimeGone, formatNumber, getUniqueValues } from '../utils';
import { Filter, RefreshCw, ChevronDown, Calendar, TrendingUp, TrendingDown, Clock, Activity, LineChart as IconLineChart, XCircle, AlertCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Cell, PieChart, Pie, Legend, LabelList, LineChart, Line 
} from 'recharts';

interface Props {
  plans: PlanRow[];
  achievements: AchievedRow[];
  onRefresh: () => void;
  lastUpdated?: string;
  userFilters?: any;
}

// Redesigned Time Pie Widget (Split View: Selected Date vs Today)
const TimePieWidget = ({ selected, current }: { selected: { percentage: number, dateString: string }, current: { percentage: number, dateString: string } }) => {
    // Data for Selected Date (Report Context)
    const dataSelected = [
        { name: 'Time Gone', value: selected.percentage, fill: '#ef4444' }, // Red
        { name: 'Remaining', value: Math.max(0, 100 - selected.percentage), fill: '#334155' }, 
    ];

    // Data for Current Date (Real Time)
    const dataCurrent = [
        { name: 'Time Gone', value: current.percentage, fill: '#3b82f6' }, // Blue
        { name: 'Remaining', value: Math.max(0, 100 - current.percentage), fill: '#334155' }, 
    ];

    return (
        <div className="bg-slate-800 text-white rounded-3xl p-5 shadow-lg border border-slate-700 flex flex-col relative overflow-hidden h-full group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
             {/* Header */}
             <div className="z-10 mb-3 border-b border-slate-700 pb-2 flex justify-between items-center">
                 <div>
                    <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                        <Clock className="text-red-400" size={20} /> Time Gone
                    </h2>
                    <p className="text-slate-400 text-[10px] font-bold mt-0.5 opacity-80 uppercase tracking-wider">Monthly Cycle</p>
                 </div>
             </div>
             
             <div className="flex flex-row items-center justify-between gap-0 z-10 flex-1 h-full">
                
                {/* Left Side: Selected Data Date */}
                <div className="flex flex-col items-center flex-1 border-r border-slate-700/50 pr-2">
                    <div className="h-24 w-24 relative z-10 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataSelected}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={28}
                                    outerRadius={42}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {dataSelected.map((entry, index) => (
                                        <Cell key={`cell-s-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Report</span>
                            <span className="text-sm font-black text-white leading-tight">{selected.percentage.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="text-center mt-1">
                        <span className="text-[9px] text-red-400 font-bold block uppercase">Data Date</span>
                        <span className="text-[8px] text-slate-400 font-bold leading-tight block">{selected.dateString}</span>
                    </div>
                </div>

                {/* Right Side: Current Today Date */}
                <div className="flex flex-col items-center flex-1 pl-2">
                    <div className="h-24 w-24 relative z-10 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataCurrent}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={28}
                                    outerRadius={42}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {dataCurrent.map((entry, index) => (
                                        <Cell key={`cell-c-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Today</span>
                            <span className="text-sm font-black text-white leading-tight">{current.percentage.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="text-center mt-1">
                        <span className="text-[9px] text-blue-400 font-bold block uppercase">Real Time</span>
                        <span className="text-[8px] text-slate-400 font-bold leading-tight block">{current.dateString}</span>
                    </div>
                </div>

             </div>
             
             {/* Background Effects */}
             <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -z-0"></div>
             <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -z-0"></div>
        </div>
    );
};

const StatCard = ({ title, actual, plan, prefix = '', customBg = 'bg-white', customText = 'text-slate-800', accentColor }: any) => {
    const percent = plan ? (actual / plan) * 100 : 0;
    const isUp = percent >= 100;
    const isGSV = title.includes("GSV");
    const titleColor = isGSV ? 'text-purple-100' : 'text-blue-800'; 
    const planColor = isGSV ? 'text-purple-200' : 'text-orange-600';
    
    // Logic for percentage badge color
    let percentBadgeClass = '';
    if (isGSV) {
        percentBadgeClass = 'bg-emerald-500 text-white shadow-sm shadow-emerald-900/20'; 
    } else {
        percentBadgeClass = isUp 
            ? 'bg-emerald-500/20 text-emerald-600' 
            : 'bg-red-500/10 text-red-500';
    }

    // Styles Adjustment
    const titleClass = isGSV ? 'text-base md:text-lg' : 'text-xs'; // Bigger title for GSV
    const planValueClass = isGSV ? 'text-sm md:text-base font-bold text-purple-200/90' : 'text-sm md:text-base font-bold text-orange-600'; // Bigger plan numbers

    // Progress Bar Styles
    // For GSV: Track is white (translucent), Fill is Green
    const progressTrackClass = isGSV ? 'bg-white/30' : 'bg-slate-100'; 
    const progressFillClass = isGSV ? 'bg-emerald-500' : (isUp ? 'bg-emerald-500' : 'bg-blue-500');
    
    return (
        <div className={`${customBg} rounded-2xl p-5 shadow-lg border ${isGSV ? 'border-purple-700' : 'border-slate-100'} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out h-full flex flex-col justify-between relative overflow-hidden group`}>
            {/* Gloss Effect */}
            {!isGSV && <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-full opacity-50 blur-xl group-hover:scale-150 transition-transform duration-500"></div>}
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className={`${titleClass} font-black ${titleColor} uppercase tracking-wide`}>{title}</span>
                    <span className={`text-sm px-2 py-0.5 rounded-lg font-black ${percentBadgeClass}`}>
                        {percent.toFixed(1)}%
                    </span>
                </div>
                <div className="flex items-end gap-2 mt-2">
                    <h3 className={`text-2xl font-black ${customText}`}>{prefix}{formatNumber(actual)}</h3>
                    <span className={`${planValueClass} mb-1`}>/ {formatNumber(plan)}</span>
                </div>
            </div>
            
            <div className={`w-full h-3 rounded-full mt-4 overflow-hidden ${progressTrackClass} relative z-10`}>
                <div className={`h-full rounded-full ${progressFillClass} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-2xl border border-slate-600">
          <p className="font-bold mb-1 border-b border-slate-600 pb-1">{label}</p>
          {payload.map((p: any, i: number) => (
             <p key={i} style={{ color: p.color }} className="font-bold">
                {p.name}: {typeof p.value === 'number' && p.name.includes('%') ? p.value.toFixed(1) + '%' : formatNumber(p.value)}
             </p>
          ))}
        </div>
      );
    }
    return null;
};

// Reusable KPI Filter Component
const KpiFilterButtons = ({ current, onChange }: { current: string, onChange: (val: string) => void }) => {
    const options = [
        { k: 'GSV', l: 'GSV' }, { k: 'ECO', l: 'ECO' }, 
        { k: 'PC', l: 'PC' }, { k: 'LPC', l: 'LPC' }, { k: 'MVS', l: 'MVS' }
    ];

    return (
        <div className="flex bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
            {options.map(opt => (
                <button
                key={opt.k}
                onClick={() => onChange(opt.k)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${current === opt.k ? 'bg-gradient-to-t from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                >
                    {opt.l}
                </button>
            ))}
        </div>
    );
};

export default function EVPMDashboard({ plans, achievements, onRefresh, lastUpdated, userFilters = {} }: Props) {
  // Global Filters
  const [activeFilters, setActiveFilters] = useState({
    Region: '',
    RSM: '',
    SM: '',
    'Dist Name': '',
    'T.L Name': '',      // New Filter
    SALESMANNAMEA: '',   // New Filter
    Channel: '',
    ...userFilters
  });

  // Date Filter State
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Check Restricted View (Salesman)
  const isSalesman = !!userFilters['SALESMANNO'];
  const isRestrictedView = !!(userFilters['Dist Name'] || isSalesman);

  // 1. SMART DATE LOGIC PREPARATION
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    achievements.forEach(a => {
        if (a.Days) {
            const d = String(a.Days).split('T')[0];
            if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dates.add(d);
            }
        }
    });
    return Array.from(dates).sort();
  }, [achievements]);

  const effectiveDate = useMemo(() => {
      if (availableDates.includes(selectedDate)) return selectedDate;
      for (let i = availableDates.length - 1; i >= 0; i--) {
          if (availableDates[i] < selectedDate) {
              return availableDates[i];
          }
      }
      return selectedDate;
  }, [selectedDate, availableDates]);

  const isFallbackActive = selectedDate !== effectiveDate && availableDates.length > 0;

  useEffect(() => {
    if (achievements.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const hasDataForToday = achievements.some(a => String(a.Days).includes(today));
        
        if (!hasDataForToday) {
            if (availableDates.length > 0) {
                const latestDate = availableDates[availableDates.length - 1];
                setSelectedDate(latestDate);
            }
        }
    }
  }, [achievements, availableDates]);

  // Chart Filters States
  const [dailyKpi, setDailyKpi] = useState<'Ach GSV' | 'Ach ECO' | 'Ach PC' | 'Ach LPC' | 'Ach MVS'>('Ach GSV');
  const [channelKpi, setChannelKpi] = useState<string>('GSV');
  const [distKpi, setDistKpi] = useState<string>('GSV'); 

  // 2. FILTER LOGIC
  const filteredPlans = useMemo(() => {
    return plans.filter(row => Object.entries(activeFilters).every(([key, val]) => !val || String(row[key as keyof PlanRow]) === String(val)));
  }, [plans, activeFilters]);

  // 3. DATA MERGING (Using Effective Date)
  const currentViewData = useMemo(() => {
    return filteredPlans.map(plan => {
        const planId = String(plan.SALESMANNO).trim();
        const ach = achievements.find(a => 
            String(a.SALESMANNO).trim() === planId && 
            String(a.Days).includes(effectiveDate)
        );

        return {
            ...plan,
            "Ach GSV": ach ? Number(ach["Ach GSV"]) : 0,
            "Ach ECO": ach ? Number(ach["Ach ECO"]) : 0,
            "Ach PC": ach ? Number(ach["Ach PC"]) : 0,
            "Ach LPC": ach ? Number(ach["Ach LPC"]) : 0,
            "Ach MVS": ach ? Number(ach["Ach MVS"]) : 0,
        } as KPIRow;
    });
  }, [filteredPlans, achievements, effectiveDate]);

  // 4. DATA FOR LINE CHART (Daily Progress) - WITH TARGET LINE & FILTERED BY DATE
  const chartData = useMemo(() => {
     // 1. Calculate Total Plan for the current filtered scope and selected KPI
     const planKey = dailyKpi.replace('Ach', 'Plan') as keyof KPIRow;
     const totalPlan = filteredPlans.reduce((sum, row) => sum + (Number(row[planKey]) || 0), 0);

     const allowedSalesmen = new Set(filteredPlans.map(p => String(p.SALESMANNO).trim()));
     const relevantAchievements = achievements.filter(a => allowedSalesmen.has(String(a.SALESMANNO).trim()));
     const groupedByDate: {[key:string]: number} = {};
     
     relevantAchievements.forEach(a => {
         if (a.Days) {
             const dateKey = String(a.Days).split('T')[0];
             const val = Number(a[dailyKpi]) || 0;
             groupedByDate[dateKey] = (groupedByDate[dateKey] || 0) + val;
         }
     });

     return Object.entries(groupedByDate)
        .map(([date, value]) => {
            // Calculate Time Gone Percentage specifically for this history date
            const { percentage } = calculateTimeGone(date);
            // Expected Value (Target) = Total Plan * (Days passed / Total Days)
            const targetValue = totalPlan * (percentage / 100);

            return { 
                date, 
                value,
                target: targetValue 
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter(item => item.date <= effectiveDate); // Linked to Date Filter
  }, [filteredPlans, achievements, dailyKpi, effectiveDate]);


  // DYNAMIC FILTER OPTIONS
  const getOptions = (targetKey: string) => {
      let baseData = plans.filter(row => 
         Object.entries(userFilters).every(([k, v]) => !v || String(row[k as keyof PlanRow]) === String(v))
      );

      Object.entries(activeFilters).forEach(([filterKey, filterVal]) => {
          if (filterKey === targetKey) return;
          if (!filterVal) return;
          baseData = baseData.filter(row => String(row[filterKey as keyof PlanRow]) === String(filterVal));
      });
      
      return getUniqueValues(baseData, targetKey);
  };

  // Aggregates
  const aggregates = useMemo(() => {
    return currentViewData.reduce((acc, row) => ({
        gsv_p: acc.gsv_p + (Number(row["Plan GSV"]) || 0), gsv_a: acc.gsv_a + (Number(row["Ach GSV"]) || 0),
        eco_p: acc.eco_p + (Number(row["Plan ECO"]) || 0), eco_a: acc.eco_a + (Number(row["Ach ECO"]) || 0),
        pc_p: acc.pc_p + (Number(row["Plan PC"]) || 0), pc_a: acc.pc_a + (Number(row["Ach PC"]) || 0),
        lpc_p: acc.lpc_p + (Number(row["Plan LPC"]) || 0), lpc_a: acc.lpc_a + (Number(row["Ach LPC"]) || 0),
        mvs_p: acc.mvs_p + (Number(row["Plan MVS"]) || 0), mvs_a: acc.mvs_a + (Number(row["Ach MVS"]) || 0),
    }), { gsv_p: 0, gsv_a: 0, eco_p: 0, eco_a: 0, pc_p: 0, pc_a: 0, lpc_p: 0, lpc_a: 0, mvs_p: 0, mvs_a: 0 });
  }, [currentViewData]);

  // Channel Chart Data
  const channelData = useMemo(() => {
      const planKey = `Plan ${channelKpi}` as keyof KPIRow;
      const achKey = `Ach ${channelKpi}` as keyof KPIRow;

      const groups = currentViewData.reduce((acc: any, row) => {
          const ch = row.Channel || 'Other';
          if (!acc[ch]) acc[ch] = { name: ch, Plan: 0, Actual: 0 };
          acc[ch].Plan += (Number(row[planKey]) || 0);
          acc[ch].Actual += (Number(row[achKey]) || 0);
          return acc;
      }, {});
      return Object.values(groups).map((item: any) => ({
          ...item,
          achPct: item.Plan > 0 ? Math.round((item.Actual / item.Plan) * 100) : 0
      }));
  }, [currentViewData, channelKpi]);

  // Top/Bottom 5 (Dynamic - NOW BY PERCENTAGE)
  const topDistributors = useMemo(() => {
    const achKey = `Ach ${distKpi}` as keyof KPIRow;
    const planKey = `Plan ${distKpi}` as keyof KPIRow;

    const groups = currentViewData.reduce((acc: any, row) => {
        const d = row["Dist Name"] || 'Unknown';
        if (!acc[d]) acc[d] = { name: d, Ach: 0, Plan: 0 };
        acc[d].Ach += (Number(row[achKey]) || 0);
        acc[d].Plan += (Number(row[planKey]) || 0);
        return acc;
    }, {});

    return Object.values(groups)
        .map((g: any) => ({
            ...g,
            Value: g.Plan > 0 ? (g.Ach / g.Plan) * 100 : 0
        }))
        .sort((a:any, b:any) => b.Value - a.Value)
        .slice(0, 5);
  }, [currentViewData, distKpi]);

  const bottomDistributors = useMemo(() => {
    const achKey = `Ach ${distKpi}` as keyof KPIRow;
    const planKey = `Plan ${distKpi}` as keyof KPIRow;

    const groups = currentViewData.reduce((acc: any, row) => {
        const d = row["Dist Name"] || 'Unknown';
        if (!acc[d]) acc[d] = { name: d, Ach: 0, Plan: 0 };
        acc[d].Ach += (Number(row[achKey]) || 0);
        acc[d].Plan += (Number(row[planKey]) || 0);
        return acc;
    }, {});

    return Object.values(groups)
        .map((g: any) => ({
            ...g,
            Value: g.Plan > 0 ? (g.Ach / g.Plan) * 100 : 0
        }))
        .filter((i:any) => i.Value >= 0 && i.Plan > 0) // Filter out zero plans
        .sort((a:any, b:any) => a.Value - b.Value)
        .slice(0, 5);
  }, [currentViewData, distKpi]);

  // UPDATED: Calculate Time Gone based on effectiveDate (Selected Date)
  const timeGone = useMemo(() => calculateTimeGone(effectiveDate), [effectiveDate]);
  
  // NEW: Calculate Time Gone based on Today (Real Time)
  const timeGoneToday = useMemo(() => calculateTimeGone(), []);

  const updateFilter = (key: string, val: string) => {
      const newFilters = { ...activeFilters, [key]: val };
      setActiveFilters(newFilters);
  };
  
  const handleClearFilters = () => {
    setActiveFilters({
        Region: '',
        RSM: '',
        SM: '',
        'Dist Name': '',
        'T.L Name': '',
        SALESMANNAMEA: '',
        Channel: '',
        ...userFilters
    });
    if (availableDates.length > 0) {
        setSelectedDate(availableDates[availableDates.length - 1]);
    } else {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  const getLabel = (key: string) => {
      if (key === 'SALESMANNAMEA') return 'Salesman';
      if (key === 'T.L Name') return 'Team Leader';
      return key.replace('_', ' ');
  }

  const filterKeys = ['Region', 'RSM', 'SM', 'Dist Name', 'T.L Name', 'SALESMANNAMEA', 'Channel'];

  return (
    <div className="space-y-6 pb-12">
        {/* Header & Date Filter */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-6 shadow-md border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <Filter size={16} className="text-blue-600"/> 
                    Filters
                </h3>
                
                <div className="flex gap-2">
                    <button onClick={handleClearFilters} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold">
                        <XCircle size={12}/> Clear All
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                        <Calendar size={12}/> Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A'}
                    </span>
                    <button onClick={onRefresh} className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold">
                        <RefreshCw size={12}/> Update
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                <div className="relative col-span-1">
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className={`w-full border rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none transition-all shadow-sm ${isFallbackActive ? 'bg-orange-50 border-orange-200' : 'bg-white border-blue-200 focus:border-blue-500'}`}
                    />
                    <Calendar className={`absolute right-3 top-3 pointer-events-none ${isFallbackActive ? 'text-orange-400' : 'text-blue-400'}`} size={14}/>
                    
                    {isFallbackActive && (
                        <div className="absolute -bottom-6 right-0 bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap border border-orange-200 shadow-sm z-10">
                            <AlertCircle size={10} /> Data: {effectiveDate}
                        </div>
                    )}
                </div>

                {filterKeys.map(key => (
                    !userFilters[key] && (
                        <div key={key} className="relative group">
                            <select 
                                value={activeFilters[key as keyof typeof activeFilters]} 
                                onChange={(e) => updateFilter(key, e.target.value)}
                                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-2.5 px-3 rounded-xl outline-none focus:border-blue-500 appearance-none transition-all cursor-pointer shadow-sm"
                            >
                                <option value="">{getLabel(key)}: All</option>
                                {getOptions(key).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none group-hover:text-blue-500"/>
                        </div>
                    )
                ))}
            </div>
        </div>

        {/* SECTION 1: Time Widget & Total GSV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TimePieWidget 
                selected={{ percentage: timeGone.percentage, dateString: timeGone.dateString }} 
                current={{ percentage: timeGoneToday.percentage, dateString: timeGoneToday.dateString }}
            />
            <StatCard 
                title="Total GSV" 
                plan={aggregates.gsv_p} 
                actual={aggregates.gsv_a} 
                prefix="" 
                customBg="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800" 
                customText="text-white"
            />
        </div>

        {/* SECTION 2: Other KPIs Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="ECO Coverage" plan={aggregates.eco_p} actual={aggregates.eco_a} customBg="bg-white" />
            <StatCard title="Productive Calls" plan={aggregates.pc_p} actual={aggregates.pc_a} customBg="bg-white" />
            <StatCard title="LPC" plan={aggregates.lpc_p} actual={aggregates.lpc_a} customBg="bg-white" />
            <StatCard title="MVS" plan={aggregates.mvs_p} actual={aggregates.mvs_a} customBg="bg-white" />
        </div>

        {/* SECTION 3: LINE CHART (Daily Progress) - WITH TARGET LINE */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
             <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                 <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
                        <IconLineChart size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-700 text-lg">Daily Progression</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Comparison of Achievement vs. Time Gone Target</p>
                    </div>
                 </div>
                 
                 <div className="flex bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
                     {[
                         { k: 'Ach GSV', l: 'GSV' }, { k: 'Ach ECO', l: 'ECO' }, 
                         { k: 'Ach PC', l: 'PC' }, { k: 'Ach LPC', l: 'LPC' }, { k: 'Ach MVS', l: 'MVS' }
                     ].map(opt => (
                         <button
                            key={opt.k}
                            onClick={() => setDailyKpi(opt.k as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${dailyKpi === opt.k ? 'bg-gradient-to-t from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                         >
                             {opt.l}
                         </button>
                     ))}
                 </div>
             </div>
             
             <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{top: 50, right: 10, left: 10, bottom: 10}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis 
                            dataKey="date" 
                            padding={{ left: 30, right: 30 }}
                            height={80} 
                            angle={-90}
                            textAnchor="end"
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                if (isNaN(d.getTime())) return val;
                                const day = String(d.getDate()).padStart(2, '0');
                                const month = d.toLocaleString('en-US', { month: 'short' });
                                return `${day}-${month}`;
                            }}
                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false} 
                            tickMargin={45} 
                        />
                        <YAxis 
                            width={50}
                            tickFormatter={(val) => formatNumber(val)} 
                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false}
                            tickCount={10} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} />
                        
                        {/* Actual Achievement Line - Labels Bottom */}
                        <Line 
                            name="Achieved"
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={4} 
                            dot={{r: 4, strokeWidth: 0, fill: '#3b82f6'}} 
                            activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} 
                        >
                             <LabelList 
                                dataKey="value" 
                                position="bottom" 
                                offset={25}
                                formatter={(val: number) => formatNumber(val)} 
                                style={{ fontSize: '9px', fontWeight: 'bold', fill: '#3b82f6', textShadow: '0px 0px 5px white' }} 
                            />
                        </Line>

                        {/* Target Line based on Time Gone - Labels Top */}
                        <Line 
                            name="Target (Time Gone)"
                            type="monotone" 
                            dataKey="target" 
                            stroke="#ef4444" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{r: 5, stroke: '#fff', strokeWidth: 2, fill: '#ef4444'}} 
                        >
                             <LabelList 
                                dataKey="target" 
                                position="top" 
                                offset={25}
                                formatter={(val: number) => formatNumber(val)} 
                                style={{ fontSize: '9px', fontWeight: 'bold', fill: '#ef4444', textShadow: '0px 0px 5px white' }} 
                            />
                        </Line>
                    </LineChart>
                </ResponsiveContainer>
             </div>
        </div>

        {/* SECTION 4: Charts */}
        <div className="grid grid-cols-1 gap-6">
            
            {/* Performance by Channel (Bar Chart) */}
            {!isSalesman && (
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                        <h3 className="font-black text-slate-700 text-lg">Performance by Channel</h3>
                        <KpiFilterButtons current={channelKpi} onChange={setChannelKpi} />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={channelData} margin={{top: 20, right: 10, left: -20, bottom: 0}}>
                                <defs>
                                    <linearGradient id="colorPlanBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fdba74" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
                                    </linearGradient>
                                    <linearGradient id="colorActualBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(val) => formatNumber(val)} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} 
                                    formatter={(value) => <span style={{ marginInlineStart: '5px', marginInlineEnd: '15px' }}>{value}</span>}
                                />
                                <Bar dataKey="Plan" fill="url(#colorPlanBar)" radius={[4, 4, 0, 0]} barSize={20} name="Plan" />
                                <Bar dataKey="Actual" fill="url(#colorActualBar)" radius={[4, 4, 0, 0]} barSize={20} name="Achieved">
                                    <LabelList dataKey="achPct" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            {/* Split Row for Top 5 and Bottom 5 (PERCENTAGE BASED) */}
            {!isRestrictedView && (
                <div>
                    <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                         <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                            <Activity size={18} className="text-blue-500"/> Distributor Ranking (By %)
                         </h3>
                         <KpiFilterButtons current={distKpi} onChange={setDistKpi} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 px-3 pt-3">
                                <TrendingUp size={20} className="text-emerald-500"/>
                                <h3 className="font-black text-slate-700 text-lg">Top 5 Distributors ({distKpi} %)</h3>
                            </div>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={topDistributors} margin={{top: 20, right: 0, left: 0, bottom: 30}}>
                                        <defs>
                                            <linearGradient id="colorGsvTop" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{fontSize: 9, fontWeight: 'bold'}}
                                            angle={45} 
                                            textAnchor="middle" 
                                            interval={0} 
                                            axisLine={false} 
                                            tickLine={false}
                                            height={60} 
                                            padding={{ left: 40, right: 40 }} 
                                        />
                                        <YAxis 
                                            width={50} 
                                            tickFormatter={(val) => `${val.toFixed(0)}%`} 
                                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickCount={10} 
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area 
                                            name="% Achievement"
                                            type="monotone" 
                                            dataKey="Value" 
                                            stroke="#10b981" 
                                            strokeWidth={3} 
                                            fillOpacity={1} 
                                            fill="url(#colorGsvTop)"
                                            dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                                            activeDot={{ r: 6 }}
                                        >
                                            <LabelList 
                                                dataKey="Value" 
                                                position="top" 
                                                offset={10}
                                                formatter={(val: number) => `${val.toFixed(0)}%`} 
                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} 
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 px-3 pt-3">
                                <TrendingDown size={20} className="text-red-500"/>
                                <h3 className="font-black text-slate-700 text-lg">Bottom 5 Distributors ({distKpi} %)</h3>
                            </div>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={bottomDistributors} margin={{top: 20, right: 0, left: 0, bottom: 30}}>
                                        <defs>
                                            <linearGradient id="colorGsvBottom" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{fontSize: 9, fontWeight: 'bold'}}
                                            angle={45} 
                                            textAnchor="middle" 
                                            interval={0} 
                                            axisLine={false} 
                                            tickLine={false}
                                            height={60} 
                                            padding={{ left: 40, right: 40 }}
                                        />
                                        <YAxis 
                                            width={50} 
                                            tickFormatter={(val) => `${val.toFixed(0)}%`} 
                                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickCount={10} 
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area 
                                            name="% Achievement"
                                            type="monotone" 
                                            dataKey="Value" 
                                            stroke="#ef4444" 
                                            strokeWidth={3} 
                                            fillOpacity={1} 
                                            fill="url(#colorGsvBottom)"
                                            dot={{ r: 4, strokeWidth: 0, fill: '#ef4444' }}
                                            activeDot={{ r: 6 }}
                                        >
                                            <LabelList 
                                                dataKey="Value" 
                                                position="top" 
                                                offset={10}
                                                formatter={(val: number) => `${val.toFixed(0)}%`} 
                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#ef4444' }} 
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
