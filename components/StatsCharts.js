import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

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
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#60a5fa' }}
                    />
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
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function CountryChart({ data }) {
    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-slate-500 group-hover:text-blue-400 transition-colors">
                            {index + 1}
                        </div>
                        <span className="text-sm font-bold text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(item.count / data[0].count) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-black text-white tabular-nums">{item.count}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
