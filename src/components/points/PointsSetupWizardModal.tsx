import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { 
  Trophy, 
  Calendar, 
  Tags, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  X,
  Layers,
  Award
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';

interface PointsSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const PointsSetupWizardModal: React.FC<PointsSetupWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { 
    competitions, 
    categories, 
    addCompetition, 
    addCategory, 
    deleteCategory, 
    toggleSubmissionsAllowed 
  } = usePortal();

  // Active period check
  const activePeriod = competitions.find(c => c.status === 'active');

  // Step tracking: 1 | 2 | 3
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Evaluation Period State
  const [periodName, setPeriodName] = useState(() => {
    const currentYear = new Date().getFullYear();
    return `Academic Year ${currentYear}–${currentYear + 1}`;
  });
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  });
  const [enableSubmissionsImmediately, setEnableSubmissionsImmediately] = useState(true);

  // Step 2: Point Categories State (Add category mini-form)
  const [showAddCatForm, setShowAddCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDefaultPoints, setNewCatDefaultPoints] = useState<number>(10);
  const [newCatIsRankBased, setNewCatIsRankBased] = useState(false);
  const [newCatRank1, setNewCatRank1] = useState<number>(10);
  const [newCatRank2, setNewCatRank2] = useState<number>(7);
  const [newCatRank3, setNewCatRank3] = useState<number>(5);
  const [addingCategory, setAddingCategory] = useState(false);

  // General loading / error
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Preset recommended categories to quickly populate if empty
  const defaultRecommendedCategories = [
    { name: 'Academic Excellence & Examinations', defaultPoints: 15, isRankBased: true, rank1: 20, rank2: 15, rank3: 10 },
    { name: 'Debates, Elocution & Public Speaking', defaultPoints: 10, isRankBased: true, rank1: 15, rank2: 10, rank3: 7 },
    { name: 'Arts, Cultural & Literary Competitions', defaultPoints: 10, isRankBased: true, rank1: 12, rank2: 8, rank3: 5 },
    { name: 'Campus Leadership & Organizational Roles', defaultPoints: 10, isRankBased: false },
    { name: 'Sports, Athletics & Fitness Events', defaultPoints: 10, isRankBased: true, rank1: 15, rank2: 10, rank3: 7 },
    { name: 'Community Volunteering & Social Service', defaultPoints: 8, isRankBased: false },
  ];

  const handleAddQuickPreset = async (preset: typeof defaultRecommendedCategories[0]) => {
    setErrorMsg('');
    setAddingCategory(true);
    try {
      await addCategory(
        preset.name,
        preset.defaultPoints,
        preset.isRankBased,
        preset.rank1,
        preset.rank2,
        preset.rank3
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add category');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setErrorMsg('Please specify a category name.');
      return;
    }
    setErrorMsg('');
    setAddingCategory(true);
    try {
      await addCategory(
        newCatName.trim(),
        newCatDefaultPoints,
        newCatIsRankBased,
        newCatRank1,
        newCatRank2,
        newCatRank3
      );
      setNewCatName('');
      setNewCatDefaultPoints(10);
      setNewCatIsRankBased(false);
      setShowAddCatForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create category.');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleStep1Next = () => {
    setErrorMsg('');
    if (!periodName.trim()) {
      setErrorMsg('Please enter a name for the evaluation period.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('Please specify both a start date and an end date.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start date must be before or equal to the end date.');
      return;
    }
    setCurrentStep(2);
  };

  const handleFinishWizard = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      // 1. Create the active evaluation period
      await addCompetition(periodName.trim(), startDate, endDate);

      // 2. If categories was completely empty, seed at least 2 common categories so users aren't left stranded
      if (categories.length === 0) {
        await addCategory('Academic & Curricular Excellence', 15, true, 20, 15, 10);
        await addCategory('Arts, Cultural & Literary Events', 10, true, 12, 8, 5);
        await addCategory('Institutional Leadership & Volunteering', 10, false);
      }

      // 3. Ensure submissions are opened so Sub-Organizations can submit achievements
      if (enableSubmissionsImmediately) {
        await toggleSubmissionsAllowed(true);
      }

      setSuccessMsg('Points Evaluation Period successfully activated! Submissions are ready.');
      setTimeout(() => {
        onClose();
        if (onComplete) onComplete();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete setup wizard. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[80] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-scale-up flex flex-col max-h-[92vh]">
        
        {/* Wizard Header */}
        <div className="bg-gradient-to-r from-[#0f1f4b] via-[#1e3a8a] to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close wizard"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-sky-300 block">
                Quick Setup Wizard
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-heading text-white">
                Set Up Points & Evaluation Period
              </h2>
            </div>
          </div>
          <p className="text-xs text-blue-100/90 leading-relaxed max-w-lg">
            Configure an active evaluation period and point categories to enable student standings, leaderboard calculations, and achievement submissions.
          </p>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep >= 1 ? 'bg-sky-400 text-[#0f1f4b]' : 'bg-white/20 text-white'
              }`}>
                1
              </div>
              <span className={`text-[11px] font-bold truncate ${
                currentStep === 1 ? 'text-white' : 'text-blue-200/80'
              }`}>
                1. Period Details
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep >= 2 ? 'bg-sky-400 text-[#0f1f4b]' : 'bg-white/20 text-white'
              }`}>
                2
              </div>
              <span className={`text-[11px] font-bold truncate ${
                currentStep === 2 ? 'text-white' : 'text-blue-200/80'
              }`}>
                2. Categories
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 3 ? 'bg-sky-400 text-[#0f1f4b]' : 'bg-white/20 text-white'
              }`}>
                3
              </div>
              <span className={`text-[11px] font-bold truncate ${
                currentStep === 3 ? 'text-white' : 'text-blue-200/80'
              }`}>
                3. Review & Finish
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Body Scrollable Area */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-blue-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: CREATE EVALUATION PERIOD */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-700" />
                  <span>Step 1: Create Evaluation Period</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  An evaluation period tracks achievements and allocates scores within a defined term or academic cycle.
                </p>
              </div>

              {activePeriod && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <span className="font-bold">Current Active Period: "{activePeriod.name}"</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Creating and activating a new period will conclude the current period ({formatDate(activePeriod.startDate)} to {formatDate(activePeriod.endDate)}) without deleting any historical points.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Evaluation Period Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Academic Year 2026–2027 or Odd Semester 2026"
                    value={periodName}
                    onChange={(e) => setPeriodName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                  />
                  <span className="text-[10px] text-slate-400">
                    This name will appear on student transcripts, portal leaderboards, and certificates.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 p-3 bg-blue-500/10/60 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-500/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableSubmissionsImmediately}
                      onChange={(e) => setEnableSubmissionsImmediately(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">Open Achievement Submissions Immediately</span>
                      <span className="text-[11px] text-slate-600">
                        Allow class sub-organizations to start submitting achievements as soon as this period starts.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: POINT CATEGORIES */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Tags className="w-4 h-4 text-blue-700" />
                    <span>Step 2: Add or Confirm Point Categories</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Categories define what types of events students can claim points for, with standard or rank-based scoring.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCatForm(!showAddCatForm)}
                  className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-700" />
                  <span>{showAddCatForm ? 'Hide Form' : 'Add Custom Category'}</span>
                </button>
              </div>

              {/* Add Custom Category Drawer */}
              {showAddCatForm && (
                <form onSubmit={handleCreateNewCategory} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">New Category Details</h4>
                    <button
                      type="button"
                      onClick={() => setShowAddCatForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Category Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Science Exhibition / Sports Tournament"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="rankBasedCheck"
                      checked={newCatIsRankBased}
                      onChange={(e) => setNewCatIsRankBased(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="rankBasedCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Position/Rank-based Points (1st, 2nd, 3rd place)
                    </label>
                  </div>

                  {newCatIsRankBased ? (
                    <div className="grid grid-cols-3 gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                      <div>
                        <label className="text-[9px] font-bold text-amber-900 uppercase block">1st Place</label>
                        <input
                          type="number"
                          min="1"
                          value={newCatRank1}
                          onChange={(e) => setNewCatRank1(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-amber-900 uppercase block">2nd Place</label>
                        <input
                          type="number"
                          min="1"
                          value={newCatRank2}
                          onChange={(e) => setNewCatRank2(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-amber-900 uppercase block">3rd Place</label>
                        <input
                          type="number"
                          min="1"
                          value={newCatRank3}
                          onChange={(e) => setNewCatRank3(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold text-center"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Default Awarded Points</label>
                      <input
                        type="number"
                        min="1"
                        value={newCatDefaultPoints}
                        onChange={(e) => setNewCatDefaultPoints(Number(e.target.value))}
                        className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={addingCategory}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {addingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Save Category</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Categories List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                  Configured Point Categories ({categories.length})
                </span>

                {categories.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-slate-500">
                      No categories configured yet. You can pick from these standard student activity presets with one click:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {defaultRecommendedCategories.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddQuickPreset(preset)}
                          disabled={addingCategory}
                          className="px-3 py-1.5 bg-white hover:bg-blue-500/10 border border-slate-200 hover:border-sky-300 rounded-xl text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>+ {preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white">
                    {categories.map((cat) => (
                      <div key={cat.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{cat.name}</p>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {cat.isRankBased ? (
                              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                                Rank-based: 1st ({cat.rank1Points} pts) • 2nd ({cat.rank2Points} pts) • 3rd ({cat.rank3Points} pts)
                              </span>
                            ) : (
                              <span className="text-blue-700 bg-blue-500/10 px-2 py-0.5 rounded font-bold border border-blue-100">
                                Fixed: +{cat.defaultPoints} pts
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          title="Delete category"
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add more quick presets helper if existing categories < 4 */}
              {categories.length > 0 && categories.length < 5 && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {defaultRecommendedCategories
                      .filter(preset => !categories.some(c => c.name.toLowerCase() === preset.name.toLowerCase()))
                      .slice(0, 3)
                      .map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddQuickPreset(preset)}
                          disabled={addingCategory}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-blue-500/10 border border-slate-200 hover:border-sky-300 rounded-lg text-[10px] font-medium text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5 text-blue-600" />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW AND FINISH */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  <span>Step 3: Review & Finish Setup</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your configurations before launching this evaluation period into live operation.
                </p>
              </div>

              {/* Period Summary Card */}
              <div className="p-4 bg-blue-500/10/50 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                    Evaluation Period to Activate
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-950 rounded-full border border-sky-300">
                    Will Be Active
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 font-heading">
                  {periodName}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  <span>{formatDate(startDate)} to {formatDate(endDate)}</span>
                </div>
                <p className="text-[11px] text-blue-800/90 pt-1">
                  Status: <strong>Submissions {enableSubmissionsImmediately ? 'OPEN' : 'CLOSED'}</strong> on start. Sub-organizations can immediately log achievements.
                </p>
              </div>

              {/* Categories Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Active Point Categories ({categories.length > 0 ? categories.length : '3 Default Presets'})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-blue-700 font-black">
                          {cat.isRankBased ? 'Rank-Based' : `+${cat.defaultPoints}`}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      Standard student activity categories will be automatically seeded for you.
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>What happens next:</strong> The Points page will immediately display this active period, recalculate current standings, and allow class sub-organizations to submit extracurricular achievements for administrative review.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="bg-slate-50/80 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setErrorMsg('');
                  setCurrentStep((prev) => (prev - 1) as 1 | 2);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) handleStep1Next();
                  else if (currentStep === 2) setCurrentStep(3);
                }}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinishWizard}
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Period...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish & Activate Points</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
