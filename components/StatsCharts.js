import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
    LineChart, Line, Cell
} from 'recharts';

// Distinct colors for better contrast
const COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2'];

export function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
                <p className="text-sm font-bold text-white">{`${payload[0].value} leffaa`}</p>
            </div>
        );
    }
    return null;
}

export function TurnChart({ data }) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="top" fill="#94a3b8" fontSize={12} fontWeight={700} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function MonthlyChart({ data }) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function YearDistributionChart({ data }) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function GenreChart({ data }) {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="space-y-4 w-full">
            {data.map((item, index) => (
                <div key={item.name} className="group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{item.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-black text-white">{item.count}</span>
                            <span className="text-xs font-medium text-slate-500">({((item.count / total) * 100).toFixed(0)}%)</span>
                        </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                                width: `${(item.count / total) * 100}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CountryChart({ data }) {
    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between group gap-2">
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] md:text-xs font-black text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0">
                            {index + 1}
                        </div>
                        <span
                            className="text-xl md:text-2xl flex-shrink-0"
                            role="img"
                            aria-label={`Flag of ${item.name}`}
                            style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}
                        >
                            {item.flag}
                        </span>
                        <span className="text-sm font-bold text-slate-200 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <div className="w-16 md:w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(item.count / data[0].count) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-black text-white tabular-nums w-5 text-right">{item.count}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
