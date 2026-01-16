
import React, { useState, useMemo, useEffect } from 'react';
import { PlanRow, AchievedRow, KPIRow } from '../types';
import { calculateTimeGone, formatNumber, getUniqueValues } from '../utils';
import { Filter, RefreshCw, ChevronDown, Calendar, TrendingUp, TrendingDown, Clock, Activity, LineChart as IconLineChart, XCircle } from 'lucide-react';
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

// Redesigned Time Pie Widget
const TimePieWidget = ({ percentage, dateString }: { percentage: number, dateString: string }) => {
    const data = [
        { name: 'Time Gone', value: percentage, fill: '#ef4444' }, 
        { name: 'Remaining', value: Math.max(0, 100 - percentage), fill: '#334155' }, 
    ];

    return (
        <div className="bg-slate-800 text-white rounded-3xl p-5 shadow-lg border border-slate-700 flex flex-row items-center justify-between gap-4 relative overflow-hidden h-full">
             <div className="z-10 flex-1">
                 <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <Clock className="text-red-400" size={20} /> Time Gone
                 </h2>
                 <p className="text-slate-400 text-xs font-bold mt-1 opacity-80">{dateString}</p>
                 <div className="mt-2 text-xs font-bold text-slate-500">Monthly Cycle</div>
             </div>
             
             <div className="h-32 w-32 relative z-10 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Gone</span>
                    <span className="text-lg font-black text-white leading-tight">{percentage.toFixed(0)}%</span>
                </div>
             </div>
             <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -z-0"></div>
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
        <div className={`${customBg} rounded-2xl p-5 shadow-sm border ${isGSV ? 'border-purple-700' : 'border-slate-100'} hover:shadow-md transition-all h-full flex flex-col justify-between`}>
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
            <div className={`w-full h-3 rounded-full mt-4 overflow-hidden ${progressTrackClass}`}>
                <div className={`h-full rounded-full ${progressFillClass}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
             <p key={i} style={{ color: p.color }}>
                {p.name}: {formatNumber(p.value)}
             </p>
          ))}
        </div>
      );
    }
    return null;
};

// Reusable KPI Filter Component
// Updated Styling: Gray background for inactive, Blue for active
const KpiFilterButtons = ({ current, onChange }: { current: string, onChange: (val: string) => void }) => {
    const options = [
        { k: 'GSV', l: 'GSV' }, { k: 'ECO', l: 'ECO' }, 
        { k: 'PC', l: 'PC' }, { k: 'LPC', l: 'LPC' }, { k: 'MVS', l: 'MVS' }
    ];

    return (
        <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
            {options.map(opt => (
                <button
                key={opt.k}
                onClick={() => onChange(opt.k)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${current === opt.k ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
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

  // AUTO-SELECT LATEST DATE
  useEffect(() => {
    if (achievements.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const hasDataForToday = achievements.some(a => String(a.Days).includes(today));
        
        if (!hasDataForToday) {
            const uniqueDates = Array.from(new Set(
                achievements
                    .map(a => String(a.Days).split('T')[0]) 
                    .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/)) 
            )).sort();

            if (uniqueDates.length > 0) {
                const latestDate = uniqueDates[uniqueDates.length - 1];
                setSelectedDate(latestDate);
            }
        }
    }
  }, [achievements]);

  // Chart Filters States
  const [dailyKpi, setDailyKpi] = useState<'Ach GSV' | 'Ach ECO' | 'Ach PC' | 'Ach LPC' | 'Ach MVS'>('Ach GSV');
  const [channelKpi, setChannelKpi] = useState<string>('GSV');
  const [distKpi, setDistKpi] = useState<string>('GSV'); // Controls Top 5 & Bottom 5

  // 1. FILTER LOGIC
  const filteredPlans = useMemo(() => {
    return plans.filter(row => Object.entries(activeFilters).every(([key, val]) => !val || String(row[key as keyof PlanRow]) === String(val)));
  }, [plans, activeFilters]);

  // 2. DATA MERGING
  const currentViewData = useMemo(() => {
    return filteredPlans.map(plan => {
        const planId = String(plan.SALESMANNO).trim();
        const ach = achievements.find(a => 
            String(a.SALESMANNO).trim() === planId && 
            String(a.Days).includes(selectedDate)
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
  }, [filteredPlans, achievements, selectedDate]);

  // 3. DATA FOR LINE CHART
  const chartData = useMemo(() => {
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
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredPlans, achievements, dailyKpi]);


  // DYNAMIC FILTER OPTIONS (Bi-directional)
  const getOptions = (targetKey: string) => {
      // 1. Start with Plans filtered by logged-in User Permissions
      let baseData = plans.filter(row => 
         Object.entries(userFilters).every(([k, v]) => !v || String(row[k as keyof PlanRow]) === String(v))
      );

      // 2. Apply ALL active filters EXCEPT the current targetKey
      // This allows bi-directional filtering (Distributor selects Region, Region selects Distributor)
      Object.entries(activeFilters).forEach(([filterKey, filterVal]) => {
          if (filterKey === targetKey) return; // Don't filter a dropdown by itself
          if (!filterVal) return; // Skip empty filters

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

  // Channel Chart Data (Dynamic)
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

  // Top/Bottom 5 (Dynamic)
  const topDistributors = useMemo(() => {
    const achKey = `Ach ${distKpi}` as keyof KPIRow;
    const groups = currentViewData.reduce((acc: any, row) => {
        const d = row["Dist Name"] || 'Unknown';
        if (!acc[d]) acc[d] = { name: d, Value: 0 };
        acc[d].Value += (Number(row[achKey]) || 0);
        return acc;
    }, {});
    return Object.values(groups).sort((a:any, b:any) => b.Value - a.Value).slice(0, 5);
  }, [currentViewData, distKpi]);

  const bottomDistributors = useMemo(() => {
    const achKey = `Ach ${distKpi}` as keyof KPIRow;
    const groups = currentViewData.reduce((acc: any, row) => {
        const d = row["Dist Name"] || 'Unknown';
        if (!acc[d]) acc[d] = { name: d, Value: 0 };
        acc[d].Value += (Number(row[achKey]) || 0);
        return acc;
    }, {});
    return Object.values(groups).filter((i:any) => i.Value > 0).sort((a:any, b:any) => a.Value - b.Value).slice(0, 5);
  }, [currentViewData, distKpi]);

  const timeGone = calculateTimeGone();

  // Simplified update logic (No hard resets) to allow bi-directional filtering
  const updateFilter = (key: string, val: string) => {
      const newFilters = { ...activeFilters, [key]: val };
      setActiveFilters(newFilters);
  };
  
  // Clear All Filters Handler
  const handleClearFilters = () => {
    setActiveFilters({
        Region: userFilters['Region'] || '',
        RSM: userFilters['RSM'] || '',
        SM: userFilters['SM'] || '',
        'Dist Name': userFilters['Dist Name'] || '',
        'T.L Name': userFilters['T.L Name'] || '',
        SALESMANNAMEA: userFilters['SALESMANNAMEA'] || '',
        Channel: userFilters['Channel'] || ''
    });
  };

  // Helper for nice labels
  const getLabel = (key: string) => {
      if (key === 'SALESMANNAMEA') return 'Salesman';
      if (key === 'T.L Name') return 'Team Leader';
      return key.replace('_', ' ');
  }

  // Define Filters Order
  const filterKeys = ['Region', 'RSM', 'SM', 'Dist Name', 'T.L Name', 'SALESMANNAMEA', 'Channel'];

  return (
    <div className="space-y-6 pb-12">
        {/* Header & Date Filter */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <Filter size={16} className="text-blue-600"/> 
                    Filters
                </h3>
                
                <div className="flex gap-2">
                    <button onClick={handleClearFilters} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold">
                        <XCircle size={12}/> Clear All
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-lg">
                        <Calendar size={12}/> Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A'}
                    </span>
                    <button onClick={onRefresh} className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold">
                        <RefreshCw size={12}/> Update
                    </button>
                </div>
            </div>
            
            {/* Dropdown Filters INCLUDING DATE + NEW FILTERS */}
            {/* Expanded Grid to 8 Columns on XL screens to fit Date + 7 Filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                {/* 1. Date Picker with Admin Styling */}
                <div className="relative col-span-1">
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500"
                    />
                    <Calendar className="absolute right-3 top-3 text-blue-400 pointer-events-none" size={14}/>
                </div>

                {/* 2. Other Filters (Dynamically Rendered) */}
                {filterKeys.map(key => (
                    !userFilters[key] && (
                        <div key={key} className="relative group">
                            <select 
                                value={activeFilters[key as keyof typeof activeFilters]} 
                                onChange={(e) => updateFilter(key, e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold py-2.5 px-3 rounded-xl outline-none focus:border-blue-500 appearance-none transition-all cursor-pointer"
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

        {/* SECTION 1: Time Widget & Total GSV (Purple Color Update) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TimePieWidget percentage={timeGone.percentage} dateString={timeGone.dateString} />
            <StatCard 
                title="Total GSV" 
                plan={aggregates.gsv_p} 
                actual={aggregates.gsv_a} 
                prefix="" 
                customBg="bg-gradient-to-br from-purple-900 to-indigo-900" 
                customText="text-white"
            />
        </div>

        {/* SECTION 2: Other KPIs Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="ECO Coverage" plan={aggregates.eco_p} actual={aggregates.eco_a} />
            <StatCard title="Productive Calls" plan={aggregates.pc_p} actual={aggregates.pc_a} />
            <StatCard title="LPC" plan={aggregates.lpc_p} actual={aggregates.lpc_a} />
            <StatCard title="MVS" plan={aggregates.mvs_p} actual={aggregates.mvs_a} />
        </div>

        {/* SECTION 3: LINE CHART (Daily Progress) */}
        {/* Reduce Container Padding to p-2 for wider chart */}
        <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100">
             <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                 <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <IconLineChart size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-700 text-lg">Daily Progression</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Trend over the month based on daily uploads</p>
                    </div>
                 </div>
                 
                 {/* KPI Selectors for Chart - Updated Styles */}
                 <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
                     {[
                         { k: 'Ach GSV', l: 'GSV' }, { k: 'Ach ECO', l: 'ECO' }, 
                         { k: 'Ach PC', l: 'PC' }, { k: 'Ach LPC', l: 'LPC' }, { k: 'Ach MVS', l: 'MVS' }
                     ].map(opt => (
                         <button
                            key={opt.k}
                            onClick={() => setDailyKpi(opt.k as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${dailyKpi === opt.k ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                         >
                             {opt.l}
                         </button>
                     ))}
                 </div>
             </div>
             
             {/* Updated Height to h-96 for Taller Chart */}
             <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{top: 20, right: 10, left: 10, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis 
                            dataKey="date" 
                            padding={{ left: 30, right: 30 }}
                            height={80} // Increased height for vertical labels
                            angle={-90}  // Vertical orientation (Standard for axes)
                            textAnchor="end" // Correct anchor for vertical text
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                if (isNaN(d.getTime())) return val;
                                const day = String(d.getDate()).padStart(2, '0');
                                const month = d.toLocaleString('en-US', { month: 'short' });
                                return `${day}-${month}`; // Day then Month
                            }}
                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false} 
                            tickMargin={10} 
                        />
                        <YAxis 
                            width={50}
                            tickFormatter={(val) => formatNumber(val)} 
                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false}
                            tickCount={10} // Increased side numbers 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            dot={{r: 4, strokeWidth: 0, fill: '#3b82f6'}} 
                            activeDot={{r: 6}} 
                        >
                             <LabelList 
                                dataKey="value" 
                                position="top" 
                                offset={10}
                                formatter={(val: number) => formatNumber(val)} 
                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} 
                            />
                        </Line>
                    </LineChart>
                </ResponsiveContainer>
             </div>
        </div>

        {/* SECTION 4: Charts */}
        <div className="grid grid-cols-1 gap-6">
            
            {/* Performance by Channel (Bar Chart) - HIDDEN IF SALESMAN */}
            {!isSalesman && (
                <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                        <h3 className="font-black text-slate-700 text-lg">Performance by Channel</h3>
                        <KpiFilterButtons current={channelKpi} onChange={setChannelKpi} />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={channelData} margin={{top: 20, right: 10, left: -20, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(val) => formatNumber(val)} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} 
                                    formatter={(value) => <span style={{ marginInlineStart: '5px', marginInlineEnd: '15px' }}>{value}</span>}
                                />
                                <Bar dataKey="Plan" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} name="Plan" />
                                <Bar dataKey="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} name="Achieved">
                                    <LabelList dataKey="achPct" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            {/* Split Row for Top 5 and Bottom 5 - HIDDEN FOR RESTRICTED VIEW */}
            {!isRestrictedView && (
                <div>
                    {/* Shared Control for Top/Bottom */}
                    <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100">
                         <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                            <Activity size={18} className="text-blue-500"/> Distributor Ranking
                         </h3>
                         <KpiFilterButtons current={distKpi} onChange={setDistKpi} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 px-3 pt-3">
                                <TrendingUp size={20} className="text-emerald-500"/>
                                <h3 className="font-black text-slate-700 text-lg">Top 5 Distributors ({distKpi})</h3>
                            </div>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Updated Margin Bottom to 30 */}
                                    <AreaChart data={topDistributors} margin={{top: 20, right: 0, left: 0, bottom: 30}}>
                                        <defs>
                                            <linearGradient id="colorGsvTop" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{fontSize: 9, fontWeight: 'bold'}}
                                            angle={45}  // Angled 45 deg
                                            textAnchor="middle" // Changed from start to middle as requested
                                            interval={0} 
                                            axisLine={false} 
                                            tickLine={false}
                                            height={60} // Increased Height
                                            padding={{ left: 40, right: 40 }} 
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
                                        <Area 
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
                                                formatter={(val: number) => formatNumber(val)} 
                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} 
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 px-3 pt-3">
                                <TrendingDown size={20} className="text-red-500"/>
                                <h3 className="font-black text-slate-700 text-lg">Bottom 5 Distributors ({distKpi})</h3>
                            </div>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Updated Margin Bottom to 30 */}
                                    <AreaChart data={bottomDistributors} margin={{top: 20, right: 0, left: 0, bottom: 30}}>
                                        <defs>
                                            <linearGradient id="colorGsvBottom" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{fontSize: 9, fontWeight: 'bold'}}
                                            angle={45} // Angled 45 deg
                                            textAnchor="middle" // Changed from start to middle as requested
                                            interval={0} 
                                            axisLine={false} 
                                            tickLine={false}
                                            height={60} // Increased Height
                                            padding={{ left: 40, right: 40 }}
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
                                        <Area 
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
                                                formatter={(val: number) => formatNumber(val)} 
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
