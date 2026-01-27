import { useState } from 'react'

const MONTHS_FI = [
    'Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu',
    'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'
]

const DAYS_FI = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']

export default function FinnishDatePicker({ value, onChange, onClose }) {
    const initialDate = value ? new Date(value) : new Date()
    const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    // Calendar logic
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    // Adjust JS getDay (0=Sun) to Monday=0
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Padding for start
    for (let i = 0; i < startOffset; i++) {
        days.push(null)
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, month, d))
    }

    const handlePrev = () => setViewDate(new Date(year, month - 1, 1))
    const handleNext = () => setViewDate(new Date(year, month + 1, 1))

    const isToday = (d) => {
        if (!d) return false
        const today = new Date()
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    }

    const isSelected = (d) => {
        if (!d || !value) return false
        const sel = new Date(value)
        return d.getDate() === sel.getDate() && d.getMonth() === sel.getMonth() && d.getFullYear() === sel.getFullYear()
    }

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-slate-900 w-full max-w-[320px] rounded-3xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={handlePrev} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                    </button>
                    <div className="text-center">
                        <div className="text-white font-black tracking-tight">{MONTHS_FI[month]}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">{year}</div>
                    </div>
                    <button type="button" onClick={handleNext} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                    </button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS_FI.map(d => (
                        <div key={d} className="text-[10px] text-slate-600 font-black uppercase text-center h-8 flex items-center justify-center">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => (
                        <div key={i} className="h-10 flex items-center justify-center">
                            {d ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const iso = d.toISOString().slice(0, 10)
                                        onChange(iso)
                                        onClose()
                                    }}
                                    className={`
                    w-9 h-9 rounded-xl text-sm font-bold transition-all
                    ${isSelected(d) ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' :
                                            isToday(d) ? 'text-blue-400 border border-blue-500/20 bg-blue-500/5' : 'text-slate-300 hover:bg-white/5'}
                  `}
                                >
                                    {d.getDate()}
                                </button>
                            ) : (
                                <div className="w-9 h-9" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full mt-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors border-t border-white/5 pt-6"
                >
                    Sulje
                </button>
            </div>
        </div>
    )
}
