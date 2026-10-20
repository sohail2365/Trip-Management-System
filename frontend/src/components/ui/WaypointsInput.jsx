import { Input } from './Input';
import Button from './Button';

export default function WaypointsInput({ value, onChange }) {
  function addStop() {
    onChange([...value, { stop_name: '', arrival_time: '' }]);
  }

  function removeStop(index) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateStop(index, key, val) {
    const next = [...value];
    next[index] = { ...next[index], [key]: val };
    onChange(next);
  }

  function moveUp(index) {
    if (index === 0) return;
    const next = [...value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index) {
    if (index === value.length - 1) return;
    const next = [...value];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-content-secondary">
          Waypoints / Beech ke Stops (optional)
        </label>
        <button
          type="button"
          onClick={addStop}
          className="text-xs text-brand hover:underline"
        >
          + Add Stop
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-content-muted italic py-2">
          Direct route hai to kuch add na karo. Beech mein stops hain to yahan add karo.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((wp, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="text-xs text-content-muted pt-2.5 w-6">#{idx + 1}</span>

              <div className="flex-1">
                <Input
                  value={wp.stop_name}
                  onChange={(e) => updateStop(idx, 'stop_name', e.target.value)}
                  placeholder="e.g. Sialkot"
                  required
                />
              </div>

              <div className="w-36">
                <Input
                  value={wp.arrival_time}
                  onChange={(e) => updateStop(idx, 'arrival_time', e.target.value)}
                  placeholder="10:00 AM"
                />
              </div>

              <div className="flex gap-1 pt-1.5">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="text-content-muted hover:text-content disabled:opacity-30 px-1"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === value.length - 1}
                  className="text-content-muted hover:text-content disabled:opacity-30 px-1"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeStop(idx)}
                  className="text-content-muted hover:text-danger px-1"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}