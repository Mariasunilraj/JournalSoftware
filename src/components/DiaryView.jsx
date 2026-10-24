import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  Sparkles,
  Trash2,
  Edit,
} from 'lucide-react';
import { formatINR } from '../utils/calculations';

export default function DiaryView({ diary, onSaveDiary, onDeleteDiary, trades }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().slice(0, 10),
    marketCondition: '',
    lessonsLearned: '',
    disciplineScore: 8,
    mentalState: 'Calm, focused, waiting for high-probability setups.',
  });

  const handleOpenNew = () => {
    setFormData({
      id: `DIARY-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      marketCondition: '',
      lessonsLearned: '',
      disciplineScore: 8,
      mentalState: '',
    });
    setIsEditing(true);
  };

  const handleEdit = (entry) => {
    setFormData(entry);
    setIsEditing(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date) return;
    onSaveDiary(formData);
    setIsEditing(false);
  };

  // Sort diary entries by date desc
  const sortedDiary = [...diary].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Daily Trading Diary & Psychology Journal</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Reflect on market context, emotional management, and continuous discipline improvement
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Write Today's Diary</span>
        </button>
      </div>

      {/* Editor Modal / Inline form */}
      {isEditing && (
        <div className="p-6 rounded-2xl bg-[#090909] border border-neutral-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-base font-bold text-white">
              {formData.id ? 'Edit Daily Diary Entry' : 'New Trading Day Diary Entry'}
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Trading Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-neutral-600"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Discipline & Execution Rating (1 - 10)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.disciplineScore}
                    onChange={(e) => setFormData({ ...formData, disciplineScore: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <span className="font-black text-sm text-emerald-400 w-8 text-center">
                    {formData.disciplineScore}/10
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Market Conditions & Context</label>
              <input
                type="text"
                value={formData.marketCondition}
                onChange={(e) => setFormData({ ...formData, marketCondition: e.target.value })}
                className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                placeholder="e.g. Bullish morning breakout, heavy profit booking in afternoon, expiry day pin at 25000"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Mental & Emotional State</label>
              <input
                type="text"
                value={formData.mentalState}
                onChange={(e) => setFormData({ ...formData, mentalState: e.target.value })}
                className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                placeholder="e.g. Calm and patient waiting for setup, slight urge to scalp during 12 PM consolidation"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Key Lessons & Daily Review</label>
              <textarea
                rows="4"
                value={formData.lessonsLearned}
                onChange={(e) => setFormData({ ...formData, lessonsLearned: e.target.value })}
                className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                placeholder="What did you do well? What mistake did you make? What will you do differently tomorrow?"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black"
              >
                Save Diary Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Diary Entries List */}
      <div className="space-y-4">
        {sortedDiary.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#090909] border border-neutral-800 text-neutral-500 text-sm">
            No diary entries recorded yet. Click "Write Today's Diary" above to start logging your thoughts and daily trading lessons.
          </div>
        ) : (
          sortedDiary.map((entry) => {
            // Find trades for that day
            const dayTrades = trades.filter((t) => t.date === entry.date);
            const dayPnL = dayTrades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);

            return (
              <div
                key={entry.id || entry.date}
                className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-black border border-neutral-800 text-neutral-300 font-bold text-xs sm:text-sm flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                      <span>{entry.date}</span>
                    </div>
                    {dayTrades.length > 0 && (
                      <span className={`text-xs sm:text-sm font-black ${dayPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        Day Net Profit: {formatINR(dayPnL)} ({dayTrades.length} trades)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black border border-neutral-800 text-xs sm:text-sm">
                      <span className="text-neutral-500 font-medium">Discipline:</span>
                      <strong className="text-emerald-400">{entry.disciplineScore}/10</strong>
                    </div>
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this diary entry?')) {
                          onDeleteDiary(entry.id || entry.date);
                        }
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {entry.marketCondition && (
                  <div className="text-xs sm:text-sm text-neutral-300">
                    <span className="font-bold text-neutral-500">Market Context: </span>
                    {entry.marketCondition}
                  </div>
                )}

                {entry.mentalState && (
                  <div className="text-xs sm:text-sm text-neutral-300">
                    <span className="font-bold text-neutral-500">Mindset: </span>
                    {entry.mentalState}
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-black border border-neutral-800 text-xs sm:text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">
                  <span className="font-bold text-emerald-400 block mb-1">Key Lessons & Observations:</span>
                  {entry.lessonsLearned}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
