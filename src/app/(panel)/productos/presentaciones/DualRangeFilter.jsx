import Input from "@/components/ui/Input";

export default function DualRangeFilter({ label, min, max, minLimit, maxLimit, onChangeMin, onChangeMax }) {
    const minPercent = ((min - minLimit) / (maxLimit - minLimit)) * 100;
    const maxPercent = ((max - minLimit) / (maxLimit - minLimit)) * 100;

    return (
        <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm text-primary font-medium">{label}</p>
                <p className="text-xs text-muted">{min} - {max}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                    label="Desde"
                    type="number"
                    min={minLimit}
                    max={maxLimit}
                    value={min}
                    onChange={(e) => {
                        const value = Number(e.target.value || 0);
                        onChangeMin(Math.max(minLimit, Math.min(value, max)));
                    }}
                    inputClassName="bg-white"
                />
                <Input
                    label="Hasta"
                    type="number"
                    min={minLimit}
                    max={maxLimit}
                    value={max}
                    onChange={(e) => {
                        const value = Number(e.target.value || 0);
                        onChangeMax(Math.min(maxLimit, Math.max(value, min)));
                    }}
                    inputClassName="bg-white"
                />
            </div>

            <div className="relative pt-4 pb-1">
                <div className="h-2 rounded-full bg-background border border-border relative">
                    <div
                        className="absolute h-full rounded-full bg-accent/30"
                        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
                    />
                </div>

                <input
                    type="range"
                    min={minLimit}
                    max={maxLimit}
                    value={min}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        onChangeMin(Math.min(value, max));
                    }}
                    className="absolute inset-x-0 top-0 w-full h-8 bg-transparent appearance-none pointer-events-auto"
                />

                <input
                    type="range"
                    min={minLimit}
                    max={maxLimit}
                    value={max}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        onChangeMax(Math.max(value, min));
                    }}
                    className="absolute inset-x-0 top-0 w-full h-8 bg-transparent appearance-none pointer-events-auto"
                />
            </div>
        </div>
    );
}
