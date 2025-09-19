import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import type { Page, FilterState, ChargingSession } from './types';
import { useChargingData } from './hooks/useChargingData';
import { OPERATORS, HIGHWAYS, ESTIMATED_PRICE_PER_KWH } from './constants';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';


const ICONS = {
    overview: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />,
    operator: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
    regional: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
    time: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    competitive: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
    settings: (<><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>),
    sun: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />,
    moon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />,
};

const PIE_CHART_COLORS = ['#14b8a6', '#4299e1', '#9f7aea', '#ed8936', '#f56565', '#48bb78', '#ecc94b'];

const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-primary text-text-primary border border-border rounded-md shadow-lg">
                <p className="font-bold">{label}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.color }}>
                        {`${pld.name}: ${typeof pld.value === 'number' ? pld.value.toLocaleString(undefined, {maximumFractionDigits: 2}) : pld.value }`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// --- Sub-Components ---

interface SidebarProps {
    activePage: Page;
    setActivePage: (page: Page) => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}
const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, theme, setTheme }) => {
    const navItems: { id: Page; name: string; icon: JSX.Element }[] = [
        { id: 'overview', name: '메인 개요', icon: ICONS.overview },
        { id: 'operator-comparison', name: '경쟁사 비교', icon: ICONS.operator },
        { id: 'regional-analysis', name: '지역/노선별 분석', icon: ICONS.regional },
        { id: 'time-pattern', name: '시간대/패턴 분석', icon: ICONS.time },
        { id: 'competitive-analysis', name: '자사 vs 경쟁사', icon: ICONS.competitive },
    ];
    
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <aside className="w-64 bg-primary p-4 flex flex-col fixed h-full z-20 border-r border-border">
            <h1 className="text-2xl font-bold text-highlight mb-8">EV Dashboard</h1>
            <nav className="flex-grow">
                <ul>
                    {navItems.map(item => (
                        <li key={item.id} className="mb-2">
                            <button
                                onClick={() => setActivePage(item.id)}
                                className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${
                                    activePage === item.id 
                                        ? 'bg-accent text-white font-semibold' 
                                        : 'text-text-secondary hover:bg-secondary hover:text-text-primary'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {item.icon}
                                </svg>
                                {item.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="border-t border-border pt-2">
                 <button
                    onClick={() => setActivePage('settings')}
                    className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 mb-2 ${
                        activePage === 'settings' 
                            ? 'bg-accent text-white font-semibold' 
                            : 'text-text-secondary hover:bg-secondary hover:text-text-primary'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        {ICONS.settings}
                    </svg>
                    설정
                </button>
                 <button
                    onClick={toggleTheme}
                    className="w-full text-left flex items-center p-3 rounded-lg text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors duration-200"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {theme === 'dark' ? ICONS.sun : ICONS.moon}
                    </svg>
                    {theme === 'dark' ? '라이트 모드' : '다크 모드'}
                </button>
            </div>
        </aside>
    );
};

const Header: React.FC<{ 
    filters: FilterState, 
    onFilterChange: React.Dispatch<React.SetStateAction<FilterState>>,
    allOperators: string[] 
}> = ({ filters, onFilterChange, allOperators }) => {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, part: 'start' | 'end') => {
        onFilterChange(prev => ({ ...prev, dateRange: { ...prev.dateRange, [part]: e.target.valueAsDate }}));
    }
    const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        onFilterChange(prev => ({...prev, operators: selected}));
    }
    const handleHighwayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        onFilterChange(prev => ({...prev, highways: selected}));
    }

    const formatDateForInput = (date: Date | null) => {
        if (!date) return '';
        try {
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    }
    
    return (
        <header className="bg-primary p-4 rounded-lg shadow-md mb-6 flex items-start gap-4 flex-wrap border border-border">
            <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-text-secondary">기간</label>
                <div className="flex items-center gap-2">
                    <input type="date" value={formatDateForInput(filters.dateRange.start)} onChange={(e) => handleDateChange(e, 'start')} className="bg-secondary p-2 rounded-md text-sm border border-border" />
                    <span>-</span>
                    <input type="date" value={formatDateForInput(filters.dateRange.end)} onChange={(e) => handleDateChange(e, 'end')} className="bg-secondary p-2 rounded-md text-sm border border-border" />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-secondary">운영사</label>
                    {filters.operators.length > 0 && (
                        <button 
                            onClick={() => onFilterChange(prev => ({...prev, operators: []}))}
                            className="text-xs text-accent hover:text-highlight"
                        >
                            초기화
                        </button>
                    )}
                </div>
                <select multiple value={filters.operators} onChange={handleOperatorChange} className="bg-secondary p-2 rounded-md text-sm h-24 w-40 border border-border">
                   {allOperators.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-secondary">고속도로</label>
                    {filters.highways.length > 0 && (
                        <button 
                            onClick={() => onFilterChange(prev => ({...prev, highways: []}))}
                            className="text-xs text-accent hover:text-highlight"
                        >
                            초기화
                        </button>
                    )}
                </div>
                <select multiple value={filters.highways} onChange={handleHighwayChange} className="bg-secondary p-2 rounded-md text-sm h-24 w-40 border border-border">
                   {HIGHWAYS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
            </div>
        </header>
    );
}

const SettingsPage: React.FC<{apiKey: string | null, onSave: (key: string) => void}> = ({ apiKey, onSave }) => {
    const [keyInput, setKeyInput] = useState(apiKey || '');
    
    const handleSave = () => {
        onSave(keyInput);
        alert('API 키가 저장되었습니다.');
    }

    return (
        <div className="bg-primary p-6 rounded-lg shadow-md max-w-lg mx-auto mt-10 border border-border">
            <h2 className="text-2xl font-bold mb-4 text-highlight">인증키 설정</h2>
            <p className="text-text-secondary mb-6">
                공공데이터포털(data.go.kr)에서 발급받은 '환경부 전기자동차 충전소 정보' OpenAPI의 일반 인증키를 입력해주세요.
            </p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-text-primary mb-1">
                        서비스 키
                    </label>
                    <input
                        id="apiKey"
                        type="text"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="인증키(URL 인코딩된 값)를 입력하세요"
                        className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-accent focus:border-accent"
                    />
                </div>
                <button onClick={handleSave} className="w-full bg-accent hover:bg-highlight text-white font-bold py-2 px-4 rounded-md transition-colors">
                    저장
                </button>
            </div>
             {apiKey && (
                <p className="mt-4 text-sm text-green-500">
                    인증키가 저장되어 있습니다.
                </p>
            )}
        </div>
    );
}

interface KPICardProps {
    title: string;
    value: string;
    description: string;
}
const KPICard: React.FC<KPICardProps> = ({ title, value, description }) => (
    <div className="bg-primary p-6 rounded-lg shadow-md flex-1 border border-border">
        <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
        <p className="text-text-secondary text-xs mt-2">{description}</p>
    </div>
);

interface ChartContainerProps {
    title: string;
    children: React.ReactNode;
    updatedAt: Date | null;
}
const ChartContainer: React.FC<ChartContainerProps> = ({ title, children, updatedAt }) => (
    <div className="bg-primary p-6 rounded-lg shadow-md border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
        <div className="h-72 w-full">
            {children}
        </div>
        {updatedAt && (
            <div className="text-xs text-text-secondary text-right mt-2 pt-2 border-t border-border">
                데이터 출처: 환경부 OpenAPI | 마지막 업데이트: {updatedAt.toLocaleString()}
            </div>
        )}
    </div>
);

type ChartColors = {
    tick: string;
    grid: string;
}
// --- Page Components ---

const OverviewPage: React.FC<{ data: ChargingSession[]; totalChargers: number; updatedAt: Date | null; chartColors: ChartColors }> = ({ data, totalChargers, updatedAt, chartColors }) => {
    const memoizedData = useMemo(() => {
        if (!data || data.length === 0) return {
            totalUtilization: 0,
            avgChargeTime: 0,
            avgChargeAmount: 0,
            estimatedRevenue: 0,
            operatorShare: [],
            dailySessions: [],
        };
        
        const totalChargeAmount = data.reduce((acc, s) => acc + s.chargeAmount, 0);
        const totalDurationHours = data.reduce((acc, s) => acc + (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60), 0);
        
        const operatorCounts = data.reduce((acc, session) => {
            acc[session.operator] = (acc[session.operator] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const operatorShare = Object.entries(operatorCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const dailySessionsMap = data.reduce((acc, session) => {
            const dateStr = session.startTime.toISOString().split('T')[0];
            acc[dateStr] = (acc[dateStr] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        
        const dailySessions = Object.entries(dailySessionsMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const daysInData = dailySessions.length > 1 ? (new Date(dailySessions[dailySessions.length-1]?.date).getTime() - new Date(dailySessions[0]?.date).getTime()) / (1000*60*60*24) + 1 : 1;
        const totalPossibleHours = totalChargers > 0 ? totalChargers * 24 * daysInData : 1;

        return {
            totalUtilization: (totalDurationHours / totalPossibleHours) * 100,
            avgChargeTime: (totalDurationHours / data.length) * 60,
            avgChargeAmount: totalChargeAmount / data.length,
            estimatedRevenue: totalChargeAmount * ESTIMATED_PRICE_PER_KWH,
            operatorShare,
            dailySessions,
        };
    }, [data, totalChargers]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="총 이용률 (추정)" value={`${memoizedData.totalUtilization.toFixed(2)}%`} description={`전국 고속도로 급속충전기 ${totalChargers.toLocaleString()}기 기준`} />
                <KPICard title="평균 이용시간" value={`${memoizedData.avgChargeTime.toFixed(1)} 분`} description="1회 충전 시 평균 소요 시간" />
                <KPICard title="평균 충전량" value={`${memoizedData.avgChargeAmount.toFixed(1)} kWh`} description="1회 충전 시 평균 충전량" />
                <KPICard title="매출 추정치" value={`${formatNumber(memoizedData.estimatedRevenue)} 원`} description="선택 기간 내 총 매출 추정" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <ChartContainer title="운영사별 세션 점유율" updatedAt={updatedAt}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={memoizedData.operatorShare} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={100} 
                                    label={({name, percent}: {name: string, percent: number}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                    labelLine={false}
                                >
                                    {memoizedData.operatorShare.map((_entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ color: chartColors.tick }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                <div>
                    <ChartContainer title="일별 충전 세션 수 추이" updatedAt={updatedAt}>
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={memoizedData.dailySessions} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: chartColors.tick }} />
                                <YAxis tick={{ fontSize: 12, fill: chartColors.tick }}/>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" name="세션 수" stroke="#14b8a6" fillOpacity={1} fill="url(#colorUv)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
};

const OperatorComparisonPage: React.FC<{ data: ChargingSession[]; updatedAt: Date | null; chartColors: ChartColors }> = ({ data, updatedAt, chartColors }) => {
    const memoizedData = useMemo(() => {
        const operatorStats: {[key: string]: { sessions: number, totalCharge: number, totalDuration: number }} = {};

        data.forEach(s => {
            if (!operatorStats[s.operator]) {
                operatorStats[s.operator] = { sessions: 0, totalCharge: 0, totalDuration: 0 };
            }
            operatorStats[s.operator].sessions++;
            operatorStats[s.operator].totalCharge += s.chargeAmount;
            operatorStats[s.operator].totalDuration += (s.endTime.getTime() - s.startTime.getTime());
        });

        return Object.entries(operatorStats).map(([name, stats]) => ({
            name,
            ...stats,
            revenue: stats.totalCharge * ESTIMATED_PRICE_PER_KWH,
            avgCharge: stats.sessions > 0 ? stats.totalCharge / stats.sessions : 0,
        })).sort((a, b) => b.revenue - a.revenue);

    }, [data]);

    const monthlyGrowthData = useMemo(() => {
        const lastDate = data.reduce((max, s) => s.startTime > max ? s.startTime : max, new Date(0));
        const threeMonthsAgo = new Date(lastDate);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
        threeMonthsAgo.setDate(1);
        threeMonthsAgo.setHours(0, 0, 0, 0);

        const recentData = data.filter(s => s.startTime >= threeMonthsAgo);
        
        const monthlyOperatorCounts: { [month: string]: { [operator: string]: number } } = {};
        
        recentData.forEach(s => {
            const month = `${s.startTime.getFullYear()}-${(s.startTime.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyOperatorCounts[month]) {
                monthlyOperatorCounts[month] = {};
            }
            monthlyOperatorCounts[month][s.operator] = (monthlyOperatorCounts[month][s.operator] || 0) + 1;
        });

        const allOperators = [...new Set(recentData.map(s => s.operator))];
        const allMonths = Object.keys(monthlyOperatorCounts).sort();

        const chartData = allMonths.map(month => {
            const entry: { [key: string]: string | number } = { month };
            allOperators.forEach(op => {
                entry[op] = monthlyOperatorCounts[month][op] || 0;
            });
            return entry;
        });
        
        return { chartData, operators: allOperators };
    }, [data]);


    return (
        <div className="space-y-6">
            <div className="bg-primary p-6 rounded-lg shadow-md border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-4">운영사별 실적</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-border">
                            <tr>
                                <th className="p-3 text-sm font-semibold tracking-wide">운영사</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-right">총 세션 수</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-right">매출 추정치</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-right">세션당 평균 충전량</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memoizedData.map(op => (
                                <tr key={op.name} className="border-b border-border">
                                    <td className="p-3 font-medium">{op.name}</td>
                                    <td className="p-3 text-right">{op.sessions.toLocaleString()}</td>
                                    <td className="p-3 text-right">{formatNumber(op.revenue)} 원</td>
                                    <td className="p-3 text-right">{op.avgCharge.toFixed(2)} kWh</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             <ChartContainer title="경쟁사별 매출 추정치 비교" updatedAt={updatedAt}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={memoizedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
                        <XAxis type="number" tickFormatter={formatNumber} tick={{ fontSize: 12, fill: chartColors.tick }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: chartColors.tick }}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend wrapperStyle={{ color: chartColors.tick }} />
                        <Bar dataKey="revenue" name="매출 추정치 (원)" fill="#14b8a6" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            <ChartContainer title="최근 3개월간 운영사별 성장률 (세션 수)" updatedAt={updatedAt}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyGrowthData.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: chartColors.tick }} />
                        <YAxis tick={{ fontSize: 12, fill: chartColors.tick }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: chartColors.tick, fontSize: '12px' }} />
                        {monthlyGrowthData.operators.map((op, index) => (
                             <Line 
                                key={op} 
                                type="monotone" 
                                dataKey={op} 
                                stroke={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}
                                strokeWidth={2}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    );
};

const RegionalAnalysisPage: React.FC<{ data: ChargingSession[] }> = ({ data }) => {
    const { stationData, top5, bottom5 } = useMemo(() => {
        const locationStats: { [key: string]: { count: number; totalCharge: number, highway: string, location: string, lat: number, lng: number } } = {};
        
        data.forEach(s => {
            if (!s.lat || !s.lng) return;
            const key = s.stationId;
            if (!locationStats[key]) {
                locationStats[key] = { count: 0, totalCharge: 0, highway: s.highway, location: s.location, lat: s.lat, lng: s.lng };
            }
            locationStats[key].count++;
            locationStats[key].totalCharge += s.chargeAmount;
        });

        const sortedLocations = Object.values(locationStats)
            .sort((a, b) => b.count - a.count);
        
        return {
            stationData: Object.values(locationStats),
            top5: sortedLocations.slice(0, 5),
            bottom5: sortedLocations.slice(-5).reverse(),
        };
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="bg-primary p-6 rounded-lg shadow-md border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-4">지도 기반 시각화 (충전소 밀집도)</h3>
                <div className="h-[500px] w-full rounded-lg overflow-hidden z-10">
                    <MapContainer center={[36.5, 127.5]} zoom={7} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MarkerClusterGroup>
                            {stationData.map(station => (
                                <Marker key={`${station.lat}-${station.lng}`} position={[station.lat, station.lng]}>
                                    <Popup>
                                        <strong>{station.location}</strong>
                                        <p>{station.highway}</p>
                                        <p>총 세션: {station.count.toLocaleString()}</p>
                                        <p>총 충전량: {station.totalCharge.toFixed(1)} kWh</p>
                                        <p>매출 추정: {formatNumber(station.totalCharge * ESTIMATED_PRICE_PER_KWH)} 원</p>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    </MapContainer>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-primary p-4 rounded-lg border border-border">
                    <h4 className="font-semibold mb-2 text-green-500">지역별 Top 5 충전소 (세션 수 기준)</h4>
                    <ul>
                        {top5.map(item => (
                            <li key={item.location} className="flex justify-between p-2 border-b border-border">
                                <span>{item.location} ({item.highway.split('고속도로')[0]})</span>
                                <span className="font-bold">{item.count.toLocaleString()} 세션</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-primary p-4 rounded-lg border border-border">
                    <h4 className="font-semibold mb-2 text-red-500">지역별 Bottom 5 충전소 (세션 수 기준)</h4>
                    <ul>
                        {bottom5.map(item => (
                            <li key={item.location} className="flex justify-between p-2 border-b border-border">
                                <span>{item.location} ({item.highway.split('고속도로')[0]})</span>
                                <span className="font-bold">{item.count.toLocaleString()} 세션</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const TimePatternAnalysisPage: React.FC<{ data: ChargingSession[]; updatedAt: Date | null; chartColors: ChartColors }> = ({ data, updatedAt, chartColors }) => {
     const memoizedData = useMemo(() => {
        const timeData = Array(7).fill(0).map(() => Array(24).fill(0));
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

        const peakTime = { '오전 (6-12)': 0, '오후 (12-18)': 0, '야간 (18-6)': 0 };
        const dayType = { '평일': 0, '주말': 0 };

        data.forEach(s => {
            const start = s.startTime;
            const day = start.getDay();
            const hour = start.getHours();
            timeData[day][hour]++;

            if (hour >= 6 && hour < 12) peakTime['오전 (6-12)']++;
            else if (hour >= 12 && hour < 18) peakTime['오후 (12-18)']++;
            else peakTime['야간 (18-6)']++;

            if (day === 0 || day === 6) dayType['주말']++;
            else dayType['평일']++;
        });

        const heatmap = timeData.flatMap((row, dayIndex) => 
            row.map((value, hourIndex) => ({
                day: dayOfWeek[dayIndex],
                hour: `${hourIndex}:00`,
                value
            }))
        );

        const peakTimeData = Object.entries(peakTime).map(([name, value]) => ({ name, value }));
        const dayTypeData = Object.entries(dayType).map(([name, value]) => ({ name, value }));

        return { heatmap, peakTimeData, dayTypeData };
    }, [data]);

    const maxHeatmapValue = memoizedData.heatmap.length > 0 ? Math.max(...memoizedData.heatmap.map(d => d.value), 1) : 1;
    const dayOfWeekLabels = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="space-y-6">
            <ChartContainer title="시간대별 이용률 히트맵 (요일 vs 시간대)" updatedAt={updatedAt}>
                {memoizedData.heatmap.length > 0 ? (
                    <div className="flex pt-4">
                        <div className="flex flex-col text-xs text-text-secondary pr-2 justify-around">
                            {dayOfWeekLabels.map(day => <div key={day} className="h-8 flex items-center">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-24 gap-1 flex-1">
                            {memoizedData.heatmap.map((cell, index) => (
                                <div key={index} className="h-8 rounded" title={`${cell.day} ${cell.hour}: ${cell.value} 세션`} style={{
                                    backgroundColor: `rgba(20, 184, 166, ${cell.value / maxHeatmapValue})`
                                }}></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-text-secondary">
                        히트맵 데이터가 없습니다. 데이터 필터를 확인해주세요.
                    </div>
                )}
                 <div className="flex text-xs text-text-secondary mt-1 pl-6">
                    {Array.from({length: 24}).map((_, i) => (
                        <div key={i} className="w-[calc(100%/24)] text-center">{(i % 3 === 0) ? `${i}`.padStart(2,'0') : ''}</div>
                    ))}
                </div>
            </ChartContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartContainer title="피크타임 분석" updatedAt={updatedAt}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={memoizedData.peakTimeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} label={{ fill: chartColors.tick }}>
                                {memoizedData.peakTimeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                             <Legend wrapperStyle={{ color: chartColors.tick }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <ChartContainer title="휴일/주말 vs 평일 패턴 비교" updatedAt={updatedAt}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={memoizedData.dayTypeData}>
                           <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
                           <XAxis dataKey="name" tick={{ fontSize: 12, fill: chartColors.tick }} />
                           <YAxis tick={{ fontSize: 12, fill: chartColors.tick }} />
                           <Tooltip content={<CustomTooltip />}/>
                           <Bar dataKey="value" name="세션 수" fill="#4299e1" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        </div>
    );
};

const CompetitiveAnalysisPage: React.FC<{ data: ChargingSession[]; updatedAt: Date | null; chartColors: ChartColors }> = ({ data, updatedAt, chartColors }) => {
    // 상위 2개 운영사를 기본값으로 설정
    const topOperators = useMemo(() => {
        const operatorCounts = data.reduce((acc, session) => {
            acc[session.operator] = (acc[session.operator] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        
        return Object.entries(operatorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([name]) => name);
    }, [data]);

    const [selectedOperators, setSelectedOperators] = useState<[string, string]>([
        topOperators[0] || '',
        topOperators[1] || ''
    ]);

    // topOperators가 변경되면 selectedOperators 업데이트
    useEffect(() => {
        if (topOperators.length >= 2) {
            setSelectedOperators([topOperators[0], topOperators[1]]);
        }
    }, [topOperators]);

    const allOperators = useMemo(() => [...new Set(data.map(d => d.operator))].sort(), [data]);

    const memoizedData = useMemo(() => {
        const [operator1, operator2] = selectedOperators;
        if (!operator1 || !operator2) return { marketShare: 0, growthData: [] };

        const operator1Data = data.filter(s => s.operator === operator1);
        const operator2Data = data.filter(s => s.operator === operator2);

        const operator1TotalCharge = operator1Data.reduce((sum, s) => sum + s.chargeAmount, 0);
        const operator2TotalCharge = operator2Data.reduce((sum, s) => sum + s.chargeAmount, 0);
        const totalCharge = operator1TotalCharge + operator2TotalCharge;
        
        const marketShare = totalCharge > 0 ? (operator1TotalCharge / totalCharge) * 100 : 0;
        
        const monthlyDataMap: {[key:string]: { [key: string]: number }} = {};

        data.filter(s => s.operator === operator1 || s.operator === operator2).forEach(s => {
            const month = `${s.startTime.getFullYear()}-${(s.startTime.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyDataMap[month]) {
                monthlyDataMap[month] = { [operator1]: 0, [operator2]: 0 };
            }
            monthlyDataMap[month][s.operator]++;
        });

        const growthData = Object.entries(monthlyDataMap)
            .map(([month, counts]) => ({ month, ...counts }))
            .sort((a, b) => a.month.localeCompare(b.month));
        
        return {
            marketShare,
            growthData,
            operator1,
            operator2
        }
    }, [data, selectedOperators]);

    return (
        <div className="space-y-6">
            {/* 운영사 선택 UI */}
            <div className="bg-primary p-4 rounded-lg shadow-md border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-4">비교할 운영사 선택</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">운영사 A</label>
                        <select 
                            value={selectedOperators[0]} 
                            onChange={(e) => setSelectedOperators([e.target.value, selectedOperators[1]])}
                            className="w-full bg-secondary p-2 rounded-md text-sm border border-border"
                        >
                            {allOperators.map(op => (
                                <option key={op} value={op} disabled={op === selectedOperators[1]}>
                                    {op}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">운영사 B</label>
                        <select 
                            value={selectedOperators[1]} 
                            onChange={(e) => setSelectedOperators([selectedOperators[0], e.target.value])}
                            className="w-full bg-secondary p-2 rounded-md text-sm border border-border"
                        >
                            {allOperators.map(op => (
                                <option key={op} value={op} disabled={op === selectedOperators[0]}>
                                    {op}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-primary p-6 rounded-lg shadow-md text-center border border-border">
                    <h3 className="text-text-secondary text-sm font-medium">
                        {memoizedData.operator1} 점유율 (충전량 기준)
                    </h3>
                    <p className="text-4xl font-bold text-highlight mt-2">{memoizedData.marketShare.toFixed(2)}%</p>
                    <p className="text-xs text-text-secondary mt-1">vs {memoizedData.operator2}</p>
                </div>
                 <div className="bg-secondary p-6 rounded-lg shadow-md col-span-2 border border-border">
                    <h3 className="text-text-primary font-semibold">비교 분석</h3>
                    <p className="mt-2 text-text-secondary text-sm">
                        선택된 두 운영사의 월별 세션 수 추이를 비교하여 시장 점유율 변화를 확인할 수 있습니다.
                        {memoizedData.operator1}과 {memoizedData.operator2}의 경쟁 상황을 분석해보세요.
                    </p>
                </div>
            </div>
             <ChartContainer title={`${memoizedData.operator1} vs ${memoizedData.operator2} 점유율 추이 (세션 수 기준)`} updatedAt={updatedAt}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={memoizedData.growthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: chartColors.tick }}/>
                        <YAxis tick={{ fontSize: 12, fill: chartColors.tick }} />
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend wrapperStyle={{ color: chartColors.tick }} />
                        <Line type="monotone" dataKey={memoizedData.operator1} stroke="#14b8a6" strokeWidth={2}/>
                        <Line type="monotone" dataKey={memoizedData.operator2} stroke="#ed8936" strokeWidth={2}/>
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
    const [activePage, setActivePage] = useState<Page>('overview');
    const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('ev_dashboard_api_key'));
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('ev_dashboard_theme') as 'light' | 'dark') || 'dark');
    
    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark';
        root.classList.toggle('dark', isDark);
        root.classList.toggle('light', !isDark);
        localStorage.setItem('ev_dashboard_theme', theme);
    }, [theme]);

    const handleSaveApiKey = (key: string) => {
        localStorage.setItem('ev_dashboard_api_key', key);
        setApiKey(key);
    };
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [filters, setFilters] = useState<FilterState>({
        dateRange: { start: thirtyDaysAgo, end: new Date() },
        operators: [],
        highways: [],
    });

    const { data: allData, loading, error, totalCount, lastUpdated } = useChargingData(apiKey);

    const { filteredData, allOperators } = useMemo(() => {
        const operators = [...new Set(allData.map(d => d.operator))].sort();
        const data = allData.filter(session => {
            const sessionDate = session.startTime;
            const isAfterStart = !filters.dateRange.start || sessionDate >= filters.dateRange.start;
            const isBeforeEnd = !filters.dateRange.end || sessionDate <= filters.dateRange.end;
            const inOperatorList = filters.operators.length === 0 || filters.operators.includes(session.operator);
            const inHighwayList = filters.highways.length === 0 || filters.highways.includes(session.highway);
            
            return isAfterStart && isBeforeEnd && inOperatorList && inHighwayList;
        });
        return { filteredData: data, allOperators: operators };
    }, [allData, filters]);
    
    const chartColors: ChartColors = useMemo(() => ({
        tick: theme === 'dark' ? '#94a3b8' : '#64748b',
        grid: theme === 'dark' ? '#475569' : '#e2e8f0',
    }), [theme]);


    const renderPageContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col justify-center items-center h-full text-center p-4">
                    <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-highlight"></div>
                    <span className="mt-4 text-xl">고속도로 급속 충전기 데이터를 불러오는 중...</span>
                    <span className="mt-2 text-text-secondary text-sm">최대 1분 정도 소요될 수 있습니다.</span>
                </div>
            );
        }
        
        if (error) {
            return (
                 <div className="bg-danger-bg text-danger-text p-6 rounded-lg shadow-md text-center max-w-xl mx-auto border border-danger-text/30">
                    <h3 className="text-xl font-bold mb-2">오류 발생</h3>
                    <p className="mb-4">{error}</p>
                    { !apiKey || error.includes("인증키") && (
                         <button onClick={() => setActivePage('settings')} className="mt-4 bg-accent hover:bg-highlight text-white font-bold py-2 px-4 rounded-md transition-colors">
                            설정으로 이동
                        </button>
                    )}
                </div>
            )
        }

        if (allData.length === 0 && !loading) {
             return (
                 <div className="text-center p-10">
                    <h2 className="text-2xl font-semibold mb-2">데이터가 없습니다.</h2>
                    <p className="text-text-secondary">API에서 불러온 데이터가 없거나 필터 조건에 맞는 데이터가 없습니다.</p>
                 </div>
             )
        }
        
        switch (activePage) {
            case 'overview': return <OverviewPage data={filteredData} totalChargers={totalCount} updatedAt={lastUpdated} chartColors={chartColors} />;
            case 'operator-comparison': return <OperatorComparisonPage data={filteredData} updatedAt={lastUpdated} chartColors={chartColors} />;
            case 'regional-analysis': return <RegionalAnalysisPage data={filteredData} />;
            case 'time-pattern': return <TimePatternAnalysisPage data={filteredData} updatedAt={lastUpdated} chartColors={chartColors} />;
            case 'competitive-analysis': return <CompetitiveAnalysisPage data={filteredData} updatedAt={lastUpdated} chartColors={chartColors} />;
            default: return <div>페이지를 선택해주세요.</div>;
        }
    }

    const renderPage = () => {
        if (activePage === 'settings') {
            return <SettingsPage apiKey={apiKey} onSave={handleSaveApiKey} />;
        }
        
        return (
            <>
                <Header filters={filters} onFilterChange={setFilters} allOperators={allOperators} />
                <div className="flex-grow">
                    {renderPageContent()}
                </div>
            </>
        )
    };

    return (
        <div className="flex min-h-screen font-sans">
            <Sidebar activePage={activePage} setActivePage={setActivePage} theme={theme} setTheme={setTheme} />
            <main className="flex-1 ml-64 p-8 bg-background flex flex-col">
                {renderPage()}
            </main>
        </div>
    );
}