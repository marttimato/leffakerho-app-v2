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

export function YearDistributionChart({ data, onYearClick }) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 40, bottom: 0 }}
                    style={{ outline: 'none', boxShadow: 'none' }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                    />
                    <Bar
                        dataKey="count"
                        fill="#8b5cf6"
                        radius={[0, 8, 8, 0]}
                        barSize={20}
                        onClick={(data) => onYearClick && onYearClick(data)}
                        style={{ cursor: onYearClick ? 'pointer' : 'default' }}
                    >
                        <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={11} fontWeight={800} offset={10} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function GenreChart({ data, onGenreClick }) {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="space-y-4 w-full">
            {data.map((item, index) => (
                <div
                    key={item.name}
                    onClick={() => onGenreClick && onGenreClick(item)}
                    className="group cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-2xl transition-all"
                >
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

export function CountryChart({ data, onCountryClick }) {
    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div
                    key={item.name}
                    onClick={() => onCountryClick && onCountryClick(item)}
                    className="flex items-center justify-between group gap-2 cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-2xl transition-all"
                >
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] md:text-xs font-black text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-colors flex-shrink-0">
                            {index + 1}
                        </div>
                        <img
                            src={`https://flagcdn.com/w40/${item.code.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w80/${item.code.toLowerCase()}.png 2x`}
                            width="32"
                            height="24"
                            alt={`Flag of ${item.name}`}
                            className="flex-shrink-0 rounded shadow-sm"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                        <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <div className="w-16 md:w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000 group-hover:bg-blue-400"
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
