import React, { useState, useMemo } from 'react';
import { 
  SP_Organization, SP_Achievement, SP_Category, SP_Award, SP_Member, SP_Competition, SP_AuditLog,
  getAchievementPeriodId, getAwardPeriodId 
} from '../../context/PortalContext';
import { 
  FileText, Download, Printer, Share2, Calendar, ShieldCheck, Award as AwardIcon, 
  Users, Building, CheckCircle2, AlertCircle, RefreshCw, X, Eye, ChevronRight, 
  Check, Trophy, Layers, Clock, ArrowUpRight
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: SP_Organization[];
  achievements: SP_Achievement[];
  categories: SP_Category[];
  awards: SP_Award[];
  members: SP_Member[];
  competitions: SP_Competition[];
  auditLogs: SP_AuditLog[];
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  organizations,
  achievements,
  categories,
  awards,
  members,
  competitions,
  auditLogs
}) => {
  if (!isOpen) return null;

  // Configuration filters (empty by default)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportVersion, setReportVersion] = useState<string>('');
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'config' | 'snapshots'>('config'); // Always open "Configure Report" first
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return (
      selectedPeriodId !== '' ||
      academicYear !== '' ||
      selectedOrgId !== '' ||
      reportTitle !== '' ||
      reportVersion !== '' ||
      preparedBy !== ''
    );
  }, [selectedPeriodId, academicYear, selectedOrgId, reportTitle, reportVersion, preparedBy]);

  // Saved snapshots state
  const [snapshots, setSnapshots] = useState<Array<{
    id: string;
    title: string;
    periodName: string;
    academicYear: string;
    type: string;
    version: number;
    date: string;
    summary: any;
  }>>(() => {
    try {
      const saved = localStorage.getItem('nsu_munazzam_report_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected period object
  const selectedPeriod = useMemo(() => {
    if (!selectedPeriodId || selectedPeriodId === 'all') return null;
    return competitions.find(c => c.id === selectedPeriodId) || null;
  }, [selectedPeriodId, competitions]);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;
      const input = document.getElementById('report-document');
      if (!input) return;
      const canvas = await html2canvas(input, { scale: 2, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Munazzam_Report_${reportRefNo}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGeneratePreview = () => {
    if (!selectedPeriodId) {
      setValidationError('Please select an Evaluation Period.');
      return;
    }
    if (!academicYear.trim()) {
      setValidationError('Please enter Academic Year.');
      return;
    }
    if (!selectedOrgId) {
      setValidationError('Please select an Organization / Batch Filter.');
      return;
    }
    if (!reportTitle.trim()) {
      setValidationError('Please enter a Report Title.');
      return;
    }
    if (!reportVersion.trim()) {
      setValidationError('Please enter a Report Version.');
      return;
    }
    if (!preparedBy.trim()) {
      setValidationError('Please enter Prepared By.');
      return;
    }
    setValidationError(null);
    setActiveTab('preview');
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Filtered achievements based on selected period
  const periodFilteredAchievements = useMemo(() => {
    if (!selectedPeriodId) return [];
    return achievements.filter(ach => {
      if (selectedPeriodId !== 'all') {
        const pId = getAchievementPeriodId(ach, competitions);
        if (pId !== selectedPeriodId) return false;
      }
      return true;
    });
  }, [achievements, selectedPeriodId, competitions]);

  // Verified (approved) achievements
  const verifiedAchievements = useMemo(() => {
    return periodFilteredAchievements.filter(ach => ach.status === 'Approved');
  }, [periodFilteredAchievements]);

  // Filtered awards based on selected period
  const periodFilteredAwards = useMemo(() => {
    if (!selectedPeriodId) return [];
    return awards.filter(award => {
      if (selectedPeriodId !== 'all') {
        const pId = getAwardPeriodId(award, competitions);
        if (pId !== selectedPeriodId) return false;
      }
      return true;
    });
  }, [awards, selectedPeriodId, competitions]);

  // Organization-wise performance calculation
  const orgPerformanceData = useMemo(() => {
    const map = new Map<string, {
      org: SP_Organization;
      submittedCount: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      totalPoints: number;
      status: 'SUBMITTED' | 'NO SUBMISSION' | 'CLASS ONLY' | 'DISQUALIFIED';
      activeStudentsCount: number;
      achievementsList: SP_Achievement[];
      classPubPoints: number;
    }>();

    // Initialize all active organizations
    organizations.forEach(org => {
      map.set(org.id, {
        org,
        submittedCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalPoints: 0,
        status: 'NO SUBMISSION',
        activeStudentsCount: members.filter(m => m.organizationId === org.id).length,
        achievementsList: [],
        classPubPoints: 0
      });
    });

    // Tally achievements
    periodFilteredAchievements.forEach(ach => {
      const entry = map.get(ach.organizationId);
      if (entry) {
        entry.submittedCount += 1;
        if (ach.status === 'Submitted') entry.pendingCount += 1;
        if (ach.status === 'Approved') {
          entry.approvedCount += 1;
          entry.totalPoints += (ach.awardedPoints ?? ach.requestedPoints ?? 0);
          entry.achievementsList.push(ach);
        }
        if (ach.status === 'Rejected') entry.rejectedCount += 1;
      }
    });

    // Tally class publication awards
    periodFilteredAwards.forEach(award => {
      const entry = map.get(award.organizationId);
      if (entry) {
        entry.classPubPoints += award.points;
        entry.totalPoints += award.points;
      }
    });

    // Determine status automatically
    map.forEach((data) => {
      if (data.approvedCount > 0 || data.submittedCount > 0) {
        data.status = 'SUBMITTED';
      } else if (data.classPubPoints > 0) {
        data.status = 'CLASS ONLY';
      } else {
        data.status = 'NO SUBMISSION';
      }
    });

    let results = Array.from(map.values());
    if (selectedOrgId !== 'all') {
      results = results.filter(r => r.org.id === selectedOrgId);
    }
    return results;
  }, [organizations, periodFilteredAchievements, periodFilteredAwards, members, selectedOrgId]);

  // Executive summary stats
  const summaryStats = useMemo(() => {
    const totalOrgs = organizations.length;
    const activeOrgs = orgPerformanceData.filter(o => o.status === 'SUBMITTED' || o.status === 'CLASS ONLY').length;
    const totalStudents = members.length;
    
    const studentsWithPointsSet = new Set<string>();
    verifiedAchievements.forEach(a => {
      if (a.achieverId && a.achieverId !== 'unassigned') studentsWithPointsSet.add(a.achieverId);
    });
    const studentsWithPoints = studentsWithPointsSet.size;

    const totalSubmitted = periodFilteredAchievements.length;
    const pendingCount = periodFilteredAchievements.filter(a => a.status === 'Submitted').length;
    const approvedCount = verifiedAchievements.length;
    const rejectedCount = periodFilteredAchievements.filter(a => a.status === 'Rejected').length;

    const totalIndividualPoints = verifiedAchievements.reduce((sum, a) => sum + (a.awardedPoints ?? a.requestedPoints ?? 0), 0);
    const totalClassPubPoints = periodFilteredAwards.reduce((sum, a) => sum + a.points, 0);
    const grandTotalPoints = totalIndividualPoints + totalClassPubPoints;

    return {
      totalOrgs,
      activeOrgs,
      totalStudents,
      studentsWithPoints,
      totalSubmitted,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalIndividualPoints,
      totalClassPubPoints,
      grandTotalPoints
    };
  }, [organizations, orgPerformanceData, members, verifiedAchievements, periodFilteredAchievements, periodFilteredAwards]);

  // Student Leaderboard (Section 2)
  const studentLeaderboard = useMemo(() => {
    const studentMap = new Map<string, {
      studentId: string;
      name: string;
      orgName: string;
      batchName: string;
      totalPoints: number;
      achievementCount: number;
      categories: Set<string>;
      badges: Set<string>;
      achievements: SP_Achievement[];
    }>();

    verifiedAchievements.forEach(ach => {
      if (!ach.achieverId || ach.achieverId === 'unassigned') return;
      const org = organizations.find(o => o.id === ach.organizationId);
      const cat = categories.find(c => c.id === ach.categoryId);
      
      let entry = studentMap.get(ach.achieverId);
      if (!entry) {
        entry = {
          studentId: ach.achieverId,
          name: ach.achieverName || 'Unknown Student',
          orgName: org ? org.name : 'Unknown Batch',
          batchName: org ? (org.shortCode || org.name) : 'Batch',
          totalPoints: 0,
          achievementCount: 0,
          categories: new Set<string>(),
          badges: new Set<string>(),
          achievements: []
        };
        studentMap.set(ach.achieverId, entry);
      }

      const pts = ach.awardedPoints ?? ach.requestedPoints ?? 0;
      entry.totalPoints += pts;
      entry.achievementCount += 1;
      if (cat) entry.categories.add(cat.name);
      if (ach.rank) entry.badges.add(`${ach.rank} Place`);
      // Infer notable badges from title or category
      const tLower = ach.title.toLowerCase();
      if (tLower.includes('national')) entry.badges.add('National');
      if (tLower.includes('international')) entry.badges.add('International');
      if (tLower.includes('research')) entry.badges.add('Research');
      if (tLower.includes('publication') || tLower.includes('paper')) entry.badges.add('Publication');
      if (tLower.includes('award') || tLower.includes('prize')) entry.badges.add('Award');
      if (tLower.includes('certification') || tLower.includes('certificate')) entry.badges.add('Certification');

      entry.achievements.push(ach);
    });

    const list = Array.from(studentMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Assign ranks with tie handling
    let currentRank = 1;
    const rankedList: Array<typeof list[0] & { rank: number }> = [];
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].totalPoints < list[i - 1].totalPoints) {
        currentRank = i + 1;
      }
      rankedList.push({ ...list[i], rank: currentRank });
    }

    return rankedList;
  }, [verifiedAchievements, organizations, categories]);

  // Class-Wise Leaderboard (Section 3)
  const classLeaderboard = useMemo(() => {
    const list = orgPerformanceData.map(orgData => {
      const indPts = orgData.totalPoints - orgData.classPubPoints;
      const classPub = orgData.classPubPoints;
      const total = orgData.totalPoints;
      const active = orgData.activeStudentsCount;
      return {
        orgId: orgData.org.id,
        name: orgData.org.name,
        shortCode: orgData.org.shortCode || orgData.org.name,
        indPts,
        classPub,
        total,
        active
      };
    }).sort((a, b) => b.total - a.total);

    let currentRank = 1;
    const rankedList: Array<typeof list[0] & { rank: number }> = [];
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].total < list[i - 1].total) {
        currentRank = i + 1;
      }
      rankedList.push({ ...list[i], rank: currentRank });
    }
    return rankedList;
  }, [orgPerformanceData]);

  // Category analysis
  const categoryAnalysis = useMemo(() => {
    const map = new Map<string, { category: SP_Category; totalPoints: number; count: number }>();
    categories.forEach(cat => {
      map.set(cat.id, { category: cat, totalPoints: 0, count: 0 });
    });

    verifiedAchievements.forEach(ach => {
      const entry = map.get(ach.categoryId);
      if (entry) {
        entry.totalPoints += (ach.awardedPoints ?? ach.requestedPoints ?? 0);
        entry.count += 1;
      }
    });

    return Array.from(map.values()).filter(x => x.count > 0 || x.category.isRankBased).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [categories, verifiedAchievements]);

  // Notable achievements
  const notableAchievements = useMemo(() => {
    return verifiedAchievements.filter(ach => {
      const t = ach.title.toLowerCase();
      const p = ach.programName.toLowerCase();
      return t.includes('national') || t.includes('international') || t.includes('research') || t.includes('publication') || t.includes('award') || t.includes('first') || t.includes('1st') || ach.rank === '1st' || ach.rank === '2nd';
    });
  }, [verifiedAchievements]);

  // Reference number generation
  const reportRefNo = useMemo(() => {
    const periodCode = selectedPeriod ? selectedPeriod.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() : 'OCT26';
    const versionNum = String(reportVersion || '1');
    return `MUN/MPR/${periodCode}/${versionNum.padStart(3, '0')}`;
  }, [selectedPeriod, reportVersion]);

  // Save snapshot handler
  const handleSaveSnapshot = () => {
    const newSnapshot = {
      id: `snapshot_${Date.now()}`,
      title: reportTitle,
      periodName: selectedPeriod ? selectedPeriod.name : 'All Evaluation Periods',
      academicYear,
      type: '',
      version: Number(reportVersion) || 1,
      date: new Date().toISOString(),
      summary: {
        totalPoints: summaryStats.grandTotalPoints,
        approvedCount: summaryStats.approvedCount,
        activeOrgs: summaryStats.activeOrgs
      }
    };
    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    try {
      localStorage.setItem('nsu_munazzam_report_snapshots', JSON.stringify(updated));
    } catch {}
    alert('Report snapshot saved successfully for future revision auditing!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Discard Confirmation Modal overlay */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm">Discard report configuration?</h4>
            <p className="text-xs text-slate-500">All unsaved report parameter settings and filters will be lost.</p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="bg-[#1B4D3E] text-white p-6 shrink-0 relative">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer z-10 md:top-6 md:right-6"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#C5A059] border border-[#C5A059]/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold tracking-wide">Automatic Professional Report</h2>
                <p className="text-[10px] md:text-xs text-emerald-100/80">Munazzam Institutional Reporting & Analytics Suite</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  activeTab === 'config' ? 'bg-[#C5A059] text-slate-950 border-[#C5A059] shadow-sm' : 'bg-transparent text-white border-white/20 hover:bg-white/10'
                }`}
              >
                Configure Report
              </button>
              <button
                onClick={handleGeneratePreview}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  activeTab === 'preview' ? 'bg-[#C5A059] text-slate-950 border-[#C5A059] shadow-sm' : 'bg-transparent text-white border-white/20 hover:bg-white/10'
                }`}
              >
                Report Preview
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8">
          
          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Report Parameters & Filters</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure the criteria for automatic report generation from verified Munazzam data.</p>
              </div>

              {validationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. EVALUATION PERIOD */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Evaluation Period</label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">[ Select Evaluation Period ]</option>
                    <option value="all">All Evaluation Periods (Cumulative)</option>
                    {competitions.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.status === 'active' ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. ACADEMIC YEAR */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2026–27"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 3. ORGANIZATION / BATCH FILTER */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Organization / Batch Filter</label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">[ Select Organization / Batch ]</option>
                    <option value="all">All Organizations & Batches</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                {/* 4. REPORT TITLE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Report Title</label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Enter Report Title"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 5. REPORT VERSION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Report Version (Revision)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={reportVersion}
                      onChange={(e) => setReportVersion(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 animate-none"
                    />
                    {reportVersion.trim() && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-3 rounded-2xl border border-emerald-200 whitespace-nowrap">
                        v{reportVersion} Revised
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. PREPARED BY */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Prepared By</label>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    placeholder="Enter name / designation"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  className="px-6 py-3 bg-[#1B4D3E] hover:bg-[#14392e] text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Generate & View Report Preview
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW (OFFICIAL DOCUMENT) */}
          {activeTab === 'preview' && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Top Action Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Ready for Export • Ref: <strong className="font-mono text-emerald-800">{reportRefNo}</strong></span>
                  </div>
                  <button
                    onClick={() => setActiveTab('snapshots')}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    View Snapshots ({snapshots.length})
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSaveSnapshot}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Save Snapshot
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex-1 px-4 py-2 bg-[#1B4D3E] hover:bg-[#14392e] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Printer className="w-3.5 h-3.5" />
                        Print / Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* REPORT DOCUMENT CONTAINER */}
              <div id="report-document" className="bg-white rounded-3xl shadow-xl border border-slate-300 p-8 sm:p-14 space-y-10 text-slate-900 print:shadow-none print:border-none print:p-0">
                
                {/* 1. REPORT COVER / HEADER */}
                <div className="border-b-2 border-[#1B4D3E] pb-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[11px] font-black tracking-widest text-[#C5A059] uppercase">NOORUL HUDA STUDENTS' UNION</p>
                      <p className="text-xs font-bold text-slate-600">Noorul Huda Islamic Academy, Madannoor</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-lg inline-block">
                        {reportRefNo}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Generated: {formatDate(new Date().toISOString())}</p>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#1B4D3E] tracking-tight">{reportTitle}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-semibold">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-800">
                        Period: <strong>{selectedPeriod ? selectedPeriod.name : 'All Evaluation Periods'}</strong>
                      </span>
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-800">
                        Academic Year: <strong>{academicYear}</strong>
                      </span>
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-lg">
                        Version: <strong>v{reportVersion} (Revised)</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Prepared by</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{preparedBy || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Dataset Scope</p>
                      <p className="font-extrabold text-emerald-800 mt-0.5">
                        {selectedOrgId === 'all' ? 'All Batches (Verified)' : `${organizations.find(o => o.id === selectedOrgId)?.name || 'Batch'} (Verified)`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">Official & Finalized</p>
                    </div>
                  </div>
                </div>

                {/* 2. EXECUTIVE SUMMARY */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#1B4D3E] uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                    <span>1. Executive Summary & Period Statistics</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Active Organizations</p>
                      <p className="text-lg font-black text-slate-900">{summaryStats.activeOrgs} <span className="text-xs font-normal text-slate-500">/ {summaryStats.totalOrgs}</span></p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Students With Points</p>
                      <p className="text-lg font-black text-emerald-800">{summaryStats.studentsWithPoints} <span className="text-xs font-normal text-slate-500">/ {summaryStats.totalStudents}</span></p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Approved Submissions</p>
                      <p className="text-lg font-black text-blue-900">{summaryStats.approvedCount} <span className="text-xs font-normal text-slate-500">({summaryStats.totalSubmitted} total)</span></p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-1">
                      <p className="text-[10px] font-bold text-emerald-900 uppercase">Grand Total Points</p>
                      <p className="text-lg font-black text-emerald-900">{summaryStats.grandTotalPoints} pts</p>
                    </div>
                  </div>
                </div>

                {/* 3. ORGANIZATION PERFORMANCE TABLE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#1B4D3E] uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#C5A059]" />
                    <span>2. Organization & Batch Performance Summary</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1B4D3E] text-white font-bold">
                        <tr>
                          <th className="p-3">Batch / Organization</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Submitted</th>
                          <th className="p-3 text-center">Pending</th>
                          <th className="p-3 text-center">Approved</th>
                          <th className="p-3 text-center">Rejected</th>
                          <th className="p-3 text-right">Awarded Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orgPerformanceData.map((row) => (
                          <tr key={row.org.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-900">{row.org.name}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                row.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-800' :
                                row.status === 'CLASS ONLY' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-center font-medium">{row.submittedCount}</td>
                            <td className="p-3 text-center font-medium text-amber-600">{row.pendingCount}</td>
                            <td className="p-3 text-center font-bold text-emerald-700">{row.approvedCount}</td>
                            <td className="p-3 text-center font-medium text-rose-600">{row.rejectedCount}</td>
                            <td className="p-3 text-right font-black text-slate-900">+{row.totalPoints} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. CLASS-WISE DETAILED ACTIVITY REPORTS */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-[#1B4D3E] uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C5A059]" />
                    <span>3. Class-Wise Detailed Activity Reports</span>
                  </h3>

                  {orgPerformanceData.filter(o => o.achievementsList.length > 0 || o.classPubPoints > 0).length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 bg-slate-50 rounded-2xl text-center">No verified achievement activity recorded for the selected period.</p>
                  ) : (
                    orgPerformanceData
                      .filter(o => o.achievementsList.length > 0 || o.classPubPoints > 0)
                      .map(orgData => (
                        <div key={orgData.org.id} className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50/50">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <h4 className="font-black text-slate-900 text-sm">{orgData.org.name}</h4>
                            <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              Batch Total: +{orgData.totalPoints} pts
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <thead className="bg-slate-100 text-slate-700 font-bold">
                                <tr>
                                  <th className="p-2.5">Student / Achiever</th>
                                  <th className="p-2.5">Achievement / Program</th>
                                  <th className="p-2.5">Category</th>
                                  <th className="p-2.5 text-center">Rank</th>
                                  <th className="p-2.5 text-right">Points</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {orgData.achievementsList.map(ach => {
                                  const cat = categories.find(c => c.id === ach.categoryId);
                                  return (
                                    <tr key={ach.id} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-bold text-slate-900">{ach.achieverName || 'Group / Class'}</td>
                                      <td className="p-2.5 text-slate-700">{ach.title}</td>
                                      <td className="p-2.5 text-slate-500">{cat ? cat.name : 'General'}</td>
                                      <td className="p-2.5 text-center">
                                        {ach.rank ? (
                                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                                            {ach.rank}
                                          </span>
                                        ) : '—'}
                                      </td>
                                      <td className="p-2.5 text-right font-black text-emerald-800">
                                        +{ach.awardedPoints ?? ach.requestedPoints ?? 0} pts
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {orgData.classPubPoints > 0 && (
                            <div className="flex justify-between items-center text-xs bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl">
                              <span className="font-bold text-blue-900">Class Publication Points Awarded</span>
                              <span className="font-black text-blue-900">+{orgData.classPubPoints} pts</span>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>

                {/* 5. INDIVIDUAL STUDENT LEADERBOARD */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#1B4D3E] uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#C5A059]" />
                    <span>4. Individual Student Leaderboard</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1B4D3E] text-white font-bold">
                        <tr>
                          <th className="p-3 text-center w-14">Rank</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Batch / Organization</th>
                          <th className="p-3 text-center">Achievements</th>
                          <th className="p-3 text-right">Verified Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentLeaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">No verified student points recorded for this period.</td>
                          </tr>
                        ) : (
                          studentLeaderboard.map((student) => (
                            <tr key={student.studentId} className="hover:bg-slate-50/50">
                              <td className="p-3 text-center font-black text-[#1B4D3E]">
                                {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                              </td>
                              <td className="p-3 font-bold text-slate-900">{student.name}</td>
                              <td className="p-3 text-slate-600">{student.orgName}</td>
                              <td className="p-3 text-center font-medium">{student.achievementCount}</td>
                              <td className="p-3 text-right font-black text-emerald-800">+{student.totalPoints} pts</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. CLASS-WISE LEADERBOARD */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#1B4D3E] uppercase tracking-wider flex items-center gap-2">
                    <AwardIcon className="w-4 h-4 text-[#C5A059]" />
                    <span>5. Class-Wise / Batch Leaderboard</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1B4D3E] text-white font-bold">
                        <tr>
                          <th className="p-3 text-center w-14">Rank</th>
                          <th className="p-3">Batch Name</th>
                          <th className="p-3 text-center">Active Students</th>
                          <th className="p-3 text-center">Individual Pts</th>
                          <th className="p-3 text-center">Class Pub Pts</th>
                          <th className="p-3 text-right">Total Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classLeaderboard.map((cls) => (
                          <tr key={cls.orgId} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center font-black text-[#1B4D3E]">#{cls.rank}</td>
                            <td className="p-3 font-bold text-slate-900">{cls.name}</td>
                            <td className="p-3 text-center font-medium">{cls.active}</td>
                            <td className="p-3 text-center font-medium text-slate-700">+{cls.indPts}</td>
                            <td className="p-3 text-center font-medium text-blue-700">+{cls.classPub}</td>
                            <td className="p-3 text-right font-black text-emerald-900">+{cls.total} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 7. CATEGORY ANALYSIS */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#1B4D3E] uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C5A059]" />
                    <span>6. Category-Wise Point Analysis & Rank Scoring</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryAnalysis.map(item => (
                      <div key={item.category.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-900 text-xs">{item.category.name}</p>
                          <span className="font-black text-emerald-800 text-xs">+{item.totalPoints} pts</span>
                        </div>
                        {item.category.isRankBased ? (
                          <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-xl">
                            <p className="font-bold">Rank-Based Rules:</p>
                            <p>1st: {item.category.rank1Points} pts | 2nd: {item.category.rank2Points} pts | 3rd: {item.category.rank3Points} pts</p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500">Default Points: {item.category.defaultPoints} pts</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 8. OFFICIAL FOOTER */}
                <div className="border-t-2 border-slate-200 pt-6 mt-12 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2">
                  <div>
                    <p className="font-bold text-slate-700">Noorul Huda Students' Union • Munazzam Reporting Suite</p>
                    <p>This report is automatically generated from verified records maintained in Munazzam.</p>
                  </div>
                  <div className="text-right font-mono">
                    <p>Ref: {reportRefNo}</p>
                    <p>Page 1 of 1 (Final)</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: SNAPSHOTS & REVISIONS */}
          {activeTab === 'snapshots' && (
            <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Saved Report Snapshots & Revision History</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Audit trail of previously finalized reports and point snapshots.</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl">
                  {snapshots.length} Snapshots
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {snapshots.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-400 font-medium">No snapshots saved yet. Click "Save Snapshot" while viewing the report preview.</p>
                ) : (
                  snapshots.map(snap => (
                    <div key={snap.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 text-sm">{snap.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>Period: <strong>{snap.periodName}</strong></span>
                          <span>•</span>
                          <span>Version: <strong>v{snap.version}</strong></span>
                          <span>•</span>
                          <span>Saved: <strong>{formatDate(snap.date)}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-800 text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          {snap.summary.totalPoints} pts
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
