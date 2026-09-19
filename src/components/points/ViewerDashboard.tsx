import React, { useState, useMemo, useEffect } from 'react';
import { usePortal, SP_Organization, SP_Achievement, SP_Member, getAwardWinners, getWinnerDisplayName, getWinnerSubtext, getAchievementPeriodId, getAwardPeriodId } from '../../context/PortalContext';
import { EvaluationPeriodSelector } from './EvaluationPeriodSelector';
import { Award, Trophy, Star, ChevronRight, ChevronLeft, ArrowLeft, FileText, Calendar, MapPin, Eye, Film, Megaphone, HelpCircle, User, Users, Search, Building2, ChevronDown, X, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../../utils/helpers';

export interface ViewerDashboardProps {
  currentTab?: 'leaderboard' | 'awards';
  hideTabsHeader?: boolean;
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = ({ currentTab, hideTabsHeader = false }) => {
  const { organizations, achievements, awards, announcements, competitions, categories, mediaAttachments, members } = usePortal();
  
  const [selectedAchievement, setSelectedAchievement] = useState<SP_Achievement | null>(null);
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<SP_Member | null>(null);
  const [viewTab, setViewTab] = useState<'leaderboard' | 'awards'>(currentTab || 'leaderboard');
  const [leaderboardScope, setLeaderboardScope] = useState<'achievers' | 'organizations'>('achievers');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [awardsRecipientFilter, setAwardsRecipientFilter] = useState<'all' | 'class_organization' | 'individual'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active competition
  const activeCompetition = useMemo(() => {
    return competitions.find(c => c.status === 'active');
  }, [competitions]);

  // Selected period filter state (defaults to 'active')
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('active');

  React.useEffect(() => {
    if (currentTab) {
      setViewTab(currentTab);
    }
  }, [currentTab]);

  // Active/approved organizations only (exclude rejected/deleted)
  const activeOrganizations = useMemo(() => {
    return organizations.filter(o => o.status === 'active' || (o.status as string) === 'approved');
  }, [organizations]);

  // Sorted list of active organizations for the dropdown filter (alphabetical)
  const dropdownOrganizations = useMemo(() => {
    return [...activeOrganizations].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeOrganizations]);

  // Currently selected competition metadata
  const currentSelectedComp = useMemo(() => {
    if (selectedPeriodFilter === 'all') return null;
    if (selectedPeriodFilter === 'active') return activeCompetition || null;
    return competitions.find(c => c.id === selectedPeriodFilter) || null;
  }, [competitions, selectedPeriodFilter, activeCompetition]);

  // Helper to check if an item's period matches the filter
  const isPeriodMatch = (itemPeriodId: string | null | undefined) => {
    if (selectedPeriodFilter === 'all') return true;
    if (selectedPeriodFilter === 'active') {
      if (!activeCompetition) return !itemPeriodId;
      return itemPeriodId === activeCompetition.id || (!itemPeriodId && competitions.length <= 1);
    }
    return itemPeriodId === selectedPeriodFilter;
  };

  // Find media attachments for an achievement
  const getMediaForAchievement = (achId: string) => {
    return mediaAttachments.filter(m => m.achievementId === achId);
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'General Achievement';
  };

  const getOrgName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : 'Unknown Class';
  };

  // Compute period-specific stats for each member
  const memberPeriodStats = useMemo(() => {
    const statsMap = new Map<string, { points: number; count: number }>();
    members.forEach(m => statsMap.set(m.id, { points: 0, count: 0 }));

    achievements.forEach(a => {
      if (a.status !== 'Approved') return;
      const periodId = getAchievementPeriodId(a, competitions);
      if (!isPeriodMatch(periodId)) return;

      const pts = Number(a.awardedPoints) || 0;
      let matchedMember = members.find(m => m.id === a.achieverId);
      if (!matchedMember && a.achieverStudentId && a.organizationId) {
        matchedMember = members.find(m => m.organizationId === a.organizationId && m.studentId && m.studentId.trim().toLowerCase() === a.achieverStudentId?.trim().toLowerCase());
      }
      if (!matchedMember && a.achieverName && a.organizationId) {
        matchedMember = members.find(m => m.organizationId === a.organizationId && m.name.trim().toLowerCase() === a.achieverName.trim().toLowerCase());
      }

      if (matchedMember) {
        const current = statsMap.get(matchedMember.id) || { points: 0, count: 0 };
        statsMap.set(matchedMember.id, {
          points: current.points + pts,
          count: current.count + 1
        });
      }
    });

    return statsMap;
  }, [members, achievements, competitions, selectedPeriodFilter, activeCompetition]);

  // Compute period-specific stats for each organization
  const orgPeriodStats = useMemo(() => {
    const statsMap = new Map<string, { points: number; count: number }>();
    activeOrganizations.forEach(o => statsMap.set(o.id, { points: 0, count: 0 }));

    achievements.forEach(a => {
      if (a.status !== 'Approved') return;
      const periodId = getAchievementPeriodId(a, competitions);
      if (!isPeriodMatch(periodId)) return;

      const pts = Number(a.awardedPoints) || 0;
      if (a.organizationId) {
        const current = statsMap.get(a.organizationId) || { points: 0, count: 0 };
        statsMap.set(a.organizationId, {
          points: current.points + pts,
          count: current.count + 1
        });
      }
    });

    return statsMap;
  }, [activeOrganizations, achievements, competitions, selectedPeriodFilter, activeCompetition]);

  // Filtered & sorted members based on selected organization, period stats, and search query
  const sortedMembers = useMemo(() => {
    return [...members]
      .filter(m => {
        // Filter by organization if specific organization selected
        if (selectedOrgFilter !== 'all' && m.organizationId !== selectedOrgFilter) {
          return false;
        }
        // Search query filter (name or student ID)
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(query);
        const matchId = m.studentId && m.studentId.toLowerCase().includes(query);
        return matchName || matchId;
      })
      .map(m => {
        const stats = memberPeriodStats.get(m.id) || { points: 0, count: 0 };
        return {
          ...m,
          periodPoints: stats.points,
          periodApprovedCount: stats.count
        };
      })
      .sort((a, b) => b.periodPoints - a.periodPoints);
  }, [members, selectedOrgFilter, searchQuery, memberPeriodStats]);

  // Filtered & sorted class organizations for leaderboard
  const sortedOrganizations = useMemo(() => {
    return [...activeOrganizations]
      .filter(o => {
        // Filter by organization if specific organization selected
        if (selectedOrgFilter !== 'all' && o.id !== selectedOrgFilter) {
          return false;
        }
        // Search query filter (org name, class name, president)
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const matchName = o.name?.toLowerCase().includes(query);
        const matchClass = o.className?.toLowerCase().includes(query);
        const matchLeader = o.leader && o.leader.toLowerCase().includes(query);
        return matchName || matchClass || matchLeader;
      })
      .map(o => {
        const stats = orgPeriodStats.get(o.id) || { points: 0, count: 0 };
        return {
          ...o,
          periodPoints: stats.points,
          periodApprovedCount: stats.count
        };
      })
      .sort((a, b) => b.periodPoints - a.periodPoints);
  }, [activeOrganizations, selectedOrgFilter, searchQuery, orgPeriodStats]);

  // Filtered awards based on period and recipient type
  const filteredAwards = useMemo(() => {
    return awards.filter(award => {
      // Period filter
      const awardPeriodId = getAwardPeriodId(award, competitions);
      if (!isPeriodMatch(awardPeriodId)) return false;

      // Recipient type filter
      if (awardsRecipientFilter === 'individual') return award.recipientType === 'individual';
      if (awardsRecipientFilter === 'class_organization') return award.recipientType !== 'individual';
      return true;
    });
  }, [awards, selectedPeriodFilter, awardsRecipientFilter, competitions, activeCompetition]);

  // Compute student-specific achievements and awarded points for selected member
  const studentAchievements = selectedMemberForDetails
    ? achievements.filter((a) => {
        // Direct achieverId match
        const isMatch = (a.achieverId && a.achieverId === selectedMemberForDetails.id) ||
          (selectedMemberForDetails.studentId &&
            a.achieverStudentId &&
            a.achieverStudentId.trim().toLowerCase() === selectedMemberForDetails.studentId.trim().toLowerCase() &&
            a.organizationId === selectedMemberForDetails.organizationId) ||
          (a.organizationId === selectedMemberForDetails.organizationId &&
            a.achieverName &&
            a.achieverName.trim().toLowerCase() === selectedMemberForDetails.name.trim().toLowerCase());
        
        if (!isMatch) return false;

        // Apply period filter if selected
        const aPeriodId = getAchievementPeriodId(a, competitions);
        if (!isPeriodMatch(aPeriodId)) return false;

        return true;
      })
    : [];

  const studentAwardedPoints = studentAchievements
    .filter((a) => a.status === 'Approved')
    .reduce((sum, a) => sum + (Number(a.awardedPoints) || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6" id="viewer-portal-dashboard">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Trophy className="w-64 h-64 rotate-12 text-white" />
        </div>
        <div className="max-w-2xl space-y-2 sm:space-y-3 relative z-10">
          <span className="px-3 py-0.5 sm:py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-emerald-300">
            Public Dashboard
          </span>
          <h1 className="text-xl sm:text-3xl font-bold font-heading tracking-tight leading-tight">Student Points Leaderboard</h1>
          <p className="text-emerald-100/80 text-xs sm:text-sm leading-relaxed max-w-lg">
            Track individual student achiever points, honors, and class sub-organization standings.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      {!hideTabsHeader && (
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setViewTab('leaderboard');
              setSelectedMemberForDetails(null);
            }}
            className={`py-2.5 sm:py-3.5 px-4 sm:px-6 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              viewTab === 'leaderboard'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Leaderboard & Ranks
          </button>
          <button
            onClick={() => {
              setViewTab('awards');
              setSelectedMemberForDetails(null);
            }}
            className={`py-2.5 sm:py-3.5 px-4 sm:px-6 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              viewTab === 'awards'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Conferred Awards
          </button>
        </div>
      )}

      {/* Tab Contents */}
      {viewTab === 'leaderboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Leaderboard Table / Student Achievement Details */}
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            {selectedMemberForDetails ? (
              /* DEDICATED STUDENT ACHIEVEMENT DETAILS VIEW */
              <div className="space-y-4 sm:space-y-5" id="student-achievement-details-view">
                {/* Back Navigation Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberForDetails(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Student Achievers</span>
                  </button>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Student Profile
                  </span>
                </div>

                {/* Profile Header & Summary Card */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center font-black text-emerald-800 text-lg shadow-2xs shrink-0">
                        <User className="w-6 h-6 text-emerald-700" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading leading-tight truncate">
                          {selectedMemberForDetails.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                          {selectedMemberForDetails.studentId ? (
                            <span className="font-mono text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                              Student ID: {selectedMemberForDetails.studentId}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Student ID: N/A</span>
                          )}
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            Class Organization: {getOrgName(selectedMemberForDetails.organizationId)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact Summary Statistics */}
                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200/70 text-center shrink-0">
                      <div className="px-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Achievements</p>
                        <p className="text-base font-black text-slate-800">{studentAchievements.length}</p>
                      </div>
                      <div className="px-2 border-l border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Awarded Points</p>
                        <p className="text-base font-black text-emerald-800">+{studentAwardedPoints} pts</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center justify-between pt-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Achievements ({studentAchievements.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Click any achievement to inspect verified proofs & details
                  </span>
                </div>

                {/* Achievements List / Empty State */}
                {studentAchievements.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Award className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No achievements yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {selectedMemberForDetails.name} has not submitted any achievements.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentAchievements.map((ach) => {
                      const catName = getCategoryName(ach.categoryId);
                      const isApproved = ach.status === 'Approved';
                      const isRejected = ach.status === 'Rejected';
                      const isPending = ach.status === 'Submitted' || ach.status === 'Under Review';
                      const isReturned = ach.status === 'Returned for Correction';
                      const mediaList = getMediaForAchievement(ach.id);

                      return (
                        <div
                          key={ach.id}
                          onClick={() => setSelectedAchievement(ach)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedAchievement(ach);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${ach.title}`}
                          className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer shadow-2xs hover:shadow-xs space-y-3 group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-100">
                                  {catName}
                                </span>
                                {ach.programName && (
                                  <span className="text-xs font-semibold text-slate-500">
                                    • {ach.programName}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-900 transition-colors leading-snug">
                                {ach.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {formatDate(ach.date)}
                                </span>
                                {ach.place && (
                                  <span className="flex items-center gap-1 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {ach.place}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status & Points Information */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5 shrink-0 pt-1 sm:pt-0">
                              {isApproved && (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px] rounded-full border border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  Approved
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-900 font-bold text-[10px] rounded-full border border-rose-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                  Rejected
                                </span>
                              )}
                              {isPending && (
                                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full border border-amber-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                  {ach.status === 'Under Review' ? 'Under Review' : 'Pending'}
                                </span>
                              )}
                              {isReturned && (
                                <span className="px-2.5 py-0.5 bg-sky-100 text-sky-900 font-bold text-[10px] rounded-full border border-sky-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                                  Returned
                                </span>
                              )}

                              <div className="text-right">
                                {isApproved ? (
                                  <p className="text-xs sm:text-sm font-black text-emerald-800">
                                    Awarded Points: {ach.awardedPoints}
                                  </p>
                                ) : isRejected ? (
                                  <p className="text-xs sm:text-sm font-bold text-slate-400">
                                    0 points
                                  </p>
                                ) : (
                                  <p className="text-xs sm:text-sm font-bold text-amber-700">
                                    {ach.requestedPoints || 0} requested pts
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* View Achievement Action & Media Count */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {mediaList.length > 0 
                                ? `${mediaList.length} verified proof file(s)`
                                : 'No media attachments'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAchievement(ach);
                              }}
                              className="px-3 py-1 bg-slate-50 hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Achievement</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Live Standings
                    </h2>
                  </div>

                  {/* Scope Switcher: Achievers vs Organizations */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setLeaderboardScope('achievers')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        leaderboardScope === 'achievers'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Student Achievers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardScope('organizations')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        leaderboardScope === 'organizations'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Class Orgs</span>
                    </button>
                  </div>
                </div>

                {/* Filter & Search Toolbar (Period Filter + Organization Filter + Search Bar) */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-1">
                  {/* Evaluation Period Filter Dropdown */}
                  <EvaluationPeriodSelector
                    selectedPeriod={selectedPeriodFilter}
                    onSelectPeriod={setSelectedPeriodFilter}
                    competitions={competitions}
                  />

                  {/* Organization Filter Dropdown */}
                  <div className="relative w-full md:w-48 shrink-0">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <select
                      id="live-standings-org-filter"
                      value={selectedOrgFilter}
                      onChange={(e) => setSelectedOrgFilter(e.target.value)}
                      className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
                      aria-label="Filter leaderboard by organization"
                    >
                      <option value="all">All Organizations</option>
                      {dropdownOrganizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={
                        leaderboardScope === 'achievers'
                          ? "Search achiever name or student ID..."
                          : "Search organization name or president..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ACHIEVERS LEADERBOARD */}
                {leaderboardScope === 'achievers' && (
                  <div className="space-y-3 pt-1">
                    {sortedMembers.length === 0 ? (
                      <div className="text-center py-12 px-4 text-slate-500 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        {searchQuery
                          ? 'No student achievers match your search query.'
                          : selectedOrgFilter !== 'all'
                          ? 'No student achievers found in the selected organization.'
                          : 'No registered student achievers yet.'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {sortedMembers.map((member, index) => {
                          const rank = index + 1;
                          return (
                            <div
                              key={member.id}
                              onClick={() => setSelectedMemberForDetails(member)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedMemberForDetails(member);
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`View achievements for ${member.name}`}
                              className="flex items-center justify-between py-3.5 px-3 rounded-2xl transition-all cursor-pointer hover:bg-slate-50 hover:shadow-2xs active:scale-[0.99] border border-transparent hover:border-slate-100 min-h-[48px] group"
                            >
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                {/* Rank Badge */}
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                  {rank === 1 ? (
                                    <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                                      🥇
                                    </span>
                                  ) : rank === 2 ? (
                                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-300">
                                      🥈
                                    </span>
                                  ) : rank === 3 ? (
                                    <span className="w-8 h-8 rounded-full bg-amber-50/50 text-amber-700 flex items-center justify-center border border-amber-200">
                                      🥉
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 font-bold">{rank}</span>
                                  )}
                                </div>

                                {/* Achiever Info */}
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 text-sm truncate group-hover:text-emerald-900 transition-colors">
                                    {member.name}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                                    {member.studentId && (
                                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                        ID: {member.studentId}
                                      </span>
                                    )}
                                    <span>{getOrgName(member.organizationId)}</span>
                                    <span>• {member.periodApprovedCount || 0} approved achievements</span>
                                  </div>
                                </div>
                              </div>

                              {/* Score */}
                              <div className="text-right shrink-0 pl-2">
                                <span className="text-base font-black text-emerald-800">{member.periodPoints || 0}</span>
                                <span className="text-[10px] text-slate-500 block font-semibold">
                                  {selectedPeriodFilter === 'all' ? 'LIFETIME PTS' : 'PERIOD PTS'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ORGANIZATIONS LEADERBOARD */}
                {leaderboardScope === 'organizations' && (
                  <div className="space-y-3 pt-1">
                    {sortedOrganizations.length === 0 ? (
                      <div className="text-center py-12 px-4 text-slate-500 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        {searchQuery
                          ? 'No class organizations match your search query.'
                          : selectedOrgFilter !== 'all'
                          ? 'No organization matches the selected filter.'
                          : 'No organizations created yet. Check back soon!'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {sortedOrganizations.map((org, index) => {
                          const rank = index + 1;
                          return (
                            <div key={org.id} className="flex items-center justify-between py-3.5 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors">
                              <div className="flex items-center gap-4">
                                {/* Rank Badge */}
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                  {rank === 1 ? (
                                    <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                                      🥇
                                    </span>
                                  ) : rank === 2 ? (
                                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-300">
                                      🥈
                                    </span>
                                  ) : rank === 3 ? (
                                    <span className="w-8 h-8 rounded-full bg-amber-50/50 text-amber-700 flex items-center justify-center border border-amber-200">
                                      🥉
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">{rank}</span>
                                  )}
                                </div>

                                {/* Org Logo & Info */}
                                <div className="flex items-center gap-3">
                                  {org.logo ? (
                                    <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold uppercase">
                                      {org.name.substring(0, 2)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{org.name}</p>
                                    <p className="text-xs text-slate-500">{org.className} • President: {org.leader || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Score */}
                              <div className="text-right">
                                <span className="text-base font-black text-emerald-800">{org.periodPoints || 0}</span>
                                <span className="text-[10px] text-slate-500 block font-semibold">
                                  {selectedPeriodFilter === 'all' ? 'LIFETIME PTS' : 'PERIOD PTS'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Active Evaluations & Top Performers */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-600" />
                <span>Evaluation Period Status</span>
              </h3>
              
              {/* Active Period Card */}
              {activeCompetition ? (
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md uppercase tracking-wider">
                      Active Period
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="font-extrabold text-emerald-950 text-sm">{activeCompetition.name}</p>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    {formatDate(activeCompetition.startDate)} – {formatDate(activeCompetition.endDate)}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <p className="text-xs font-bold text-slate-700">No Active Period Running</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    There is currently no ongoing evaluation period. Use the period filter above to inspect historical period standings.
                  </p>
                </div>
              )}

              {/* Selected Filter Note if different from active */}
              {selectedPeriodFilter !== 'all' && currentSelectedComp && currentSelectedComp.id !== activeCompetition?.id && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Viewing Concluded Period</p>
                  <p className="text-xs font-extrabold text-slate-800">{currentSelectedComp.name}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-700" />
                    {formatDate(currentSelectedComp.startDate)} – {formatDate(currentSelectedComp.endDate)}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                🏆 Outstanding Award Winner
              </h3>
              {awards.length === 0 ? (
                <p className="text-xs text-slate-500 leading-normal">No awards conferred yet in this portal workspace.</p>
              ) : (
                <div className="border border-slate-100 p-4 rounded-2xl space-y-2 text-center bg-slate-50/50">
                  <span className="text-3xl">🏅</span>
                  <p className="font-bold text-slate-900 text-xs">{awards[0].name}</p>
                  {awards[0].evaluationPeriod && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      {awards[0].evaluationPeriod}
                    </span>
                  )}
                  <div className="space-y-1 text-left pt-1 border-t border-slate-200/50">
                    {getAwardWinners(awards[0]).map((w, idx) => (
                      <p key={w.achieverId || w.organizationId || idx} className="text-[11px] text-emerald-900 font-bold truncate flex items-center gap-1">
                        <span>{w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'}</span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">{w.position === 1 ? '1st:' : w.position === 2 ? '2nd:' : '3rd:'}</span>
                        <span className="truncate">{getWinnerDisplayName(w)}</span>
                      </p>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 italic pt-1">Conferred on {formatDate(awards[0].awardDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Awards Section */}
      {viewTab === 'awards' && (() => {
        const classOrgsCount = filteredAwards.filter(a => a.recipientType !== 'individual').length;
        const individualsCount = filteredAwards.filter(a => a.recipientType === 'individual').length;

        return (
          <div className="space-y-4" id="awards-gallery-section">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">Awards & Certifications Gallery</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conferred institutional awards and excellence recognitions ({filteredAwards.length} {filteredAwards.length === 1 ? 'award' : 'awards'})
                </p>
              </div>

              {/* Toolbar: Period Filter + Recipient Type Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Period Selector in Awards */}
                <EvaluationPeriodSelector
                  selectedPeriod={selectedPeriodFilter}
                  onSelectPeriod={setSelectedPeriodFilter}
                  competitions={competitions}
                />

                {/* Recipient Type Filter Control */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar">
                  <button
                    type="button"
                    id="award-filter-all"
                    onClick={() => setAwardsRecipientFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      awardsRecipientFilter === 'all'
                        ? 'bg-white text-emerald-900 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>All</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      awardsRecipientFilter === 'all'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {filteredAwards.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="award-filter-class-orgs"
                    onClick={() => setAwardsRecipientFilter('class_organization')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      awardsRecipientFilter === 'class_organization'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Class Orgs</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      awardsRecipientFilter === 'class_organization'
                        ? 'bg-emerald-950/60 text-emerald-100'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {classOrgsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="award-filter-individual"
                    onClick={() => setAwardsRecipientFilter('individual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      awardsRecipientFilter === 'individual'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Individual Achievers</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      awardsRecipientFilter === 'individual'
                        ? 'bg-purple-950/60 text-purple-100'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {individualsCount}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {filteredAwards.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 text-sm space-y-2">
                <p className="font-semibold text-slate-700">No awards found in this category.</p>
                <p className="text-xs text-slate-400">
                  {awardsRecipientFilter === 'individual' 
                    ? 'No Individual Achiever awards have been recorded yet.' 
                    : awardsRecipientFilter === 'class_organization'
                    ? 'No Class Organization awards have been recorded yet.'
                    : 'No awards recorded yet.'}
                </p>
                {awardsRecipientFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setAwardsRecipientFilter('all')}
                    className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                  >
                    View all awards ({awards.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAwards.map(award => {
                  const winners = getAwardWinners(award);
                  const isIndividual = award.recipientType === 'individual';
                  return (
                    <div key={award.id} className="bg-white rounded-3xl border border-slate-100 p-6 text-center space-y-5 shadow-sm relative overflow-hidden flex flex-col items-center hover:shadow-md transition-all duration-300">
                      {/* Subtle Decorative Background Element */}
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-50/50 rounded-full blur-2xl" />
                      
                      {/* Recipient Type Badge */}
                      <div className="w-full flex justify-end">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          isIndividual 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isIndividual ? 'Individual Achievers' : 'Class Organization'}
                        </span>
                      </div>

                      {/* Premium Badge */}
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 to-amber-100 rounded-full blur-sm opacity-50" />
                        <div className="relative w-16 h-16 bg-gradient-to-b from-amber-100 to-white rounded-full flex items-center justify-center text-3xl border-2 border-amber-200 shadow-inner">
                          🏆
                        </div>
                      </div>
                      
                      {/* Award Name */}
                      <div className="space-y-1 w-full">
                        <h3 className="font-black text-slate-900 text-lg tracking-tight font-heading leading-tight uppercase text-emerald-950">
                          {award.name}
                        </h3>
                        <div className="h-0.5 w-16 bg-amber-400 mx-auto rounded-full" />
                      </div>

                      {/* Dynamic Winner(s) Display */}
                      {winners.length <= 1 ? (
                        /* 1 Winner Layout */
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 w-full text-center shadow-inner-sm">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                            <span>🥇</span> 1st Place Winner
                          </p>
                          <p className="text-sm font-black text-emerald-950 truncate" title={getWinnerDisplayName(winners[0])}>
                            {getWinnerDisplayName(winners[0])}
                          </p>
                          {getWinnerSubtext(winners[0]) && (
                            <p className="text-[10px] font-semibold text-emerald-700/80 truncate mt-0.5" title={getWinnerSubtext(winners[0])}>
                              {getWinnerSubtext(winners[0])}
                            </p>
                          )}
                        </div>
                      ) : winners.length === 2 ? (
                        /* 2 Winners Side-by-Side */
                        <div className="w-full space-y-2">
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest text-center">
                            Award Winners (2)
                          </p>
                          <div className="grid grid-cols-2 gap-2 w-full">
                            {/* 1st Winner */}
                            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-center flex flex-col items-center min-w-0">
                              <span className="text-base mb-0.5">🥇</span>
                              <span className="text-[9px] font-black text-amber-900 uppercase tracking-wider">1st Place</span>
                              <p className="text-xs font-black text-amber-950 truncate w-full mt-0.5" title={getWinnerDisplayName(winners[0])}>
                                {getWinnerDisplayName(winners[0])}
                              </p>
                              {getWinnerSubtext(winners[0]) && (
                                <p className="text-[9px] font-semibold text-amber-800/80 truncate w-full mt-0.5" title={getWinnerSubtext(winners[0])}>
                                  {getWinnerSubtext(winners[0])}
                                </p>
                              )}
                            </div>
                            {/* 2nd Winner */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center flex flex-col items-center min-w-0">
                              <span className="text-base mb-0.5">🥈</span>
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">2nd Place</span>
                              <p className="text-xs font-black text-slate-900 truncate w-full mt-0.5" title={getWinnerDisplayName(winners[1])}>
                                {getWinnerDisplayName(winners[1])}
                              </p>
                              {getWinnerSubtext(winners[1]) && (
                                <p className="text-[9px] font-semibold text-slate-500 truncate w-full mt-0.5" title={getWinnerSubtext(winners[1])}>
                                  {getWinnerSubtext(winners[1])}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 3 Winners Podium Layout */
                        <div className="w-full space-y-2">
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest text-center">
                            Award Winners (3)
                          </p>
                          {/* 1st Place Top Featured */}
                          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-2.5 text-center flex flex-col items-center shadow-xs min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-base">🥇</span>
                              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider">1st Place Winner</span>
                            </div>
                            <p className="text-xs font-black text-amber-950 truncate w-full mt-0.5" title={getWinnerDisplayName(winners[0])}>
                              {getWinnerDisplayName(winners[0])}
                            </p>
                            {getWinnerSubtext(winners[0]) && (
                              <p className="text-[9px] font-semibold text-amber-800/80 truncate w-full mt-0.5" title={getWinnerSubtext(winners[0])}>
                                {getWinnerSubtext(winners[0])}
                              </p>
                            )}
                          </div>
                          {/* 2nd & 3rd Place Bottom Grid */}
                          <div className="grid grid-cols-2 gap-2 w-full">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 text-center flex flex-col items-center min-w-0">
                              <span className="text-sm">🥈</span>
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">2nd Place</span>
                              <p className="text-[11px] font-bold text-slate-900 truncate w-full mt-0.5" title={getWinnerDisplayName(winners[1])}>
                                {getWinnerDisplayName(winners[1])}
                              </p>
                              {getWinnerSubtext(winners[1]) && (
                                <p className="text-[9px] font-semibold text-slate-500 truncate w-full mt-0.5" title={getWinnerSubtext(winners[1])}>
                                  {getWinnerSubtext(winners[1])}
                                </p>
                              )}
                            </div>
                            <div className="bg-amber-100/40 border border-amber-200/80 rounded-2xl p-2 text-center flex flex-col items-center min-w-0">
                              <span className="text-sm">🥉</span>
                              <span className="text-[9px] font-bold text-amber-800/90 uppercase tracking-wider">3rd Place</span>
                              <p className="text-[11px] font-bold text-amber-950 truncate w-full mt-0.5" title={getWinnerDisplayName(winners[2])}>
                                {getWinnerDisplayName(winners[2])}
                              </p>
                              {getWinnerSubtext(winners[2]) && (
                                <p className="text-[9px] font-semibold text-amber-800/80 truncate w-full mt-0.5" title={getWinnerSubtext(winners[2])}>
                                  {getWinnerSubtext(winners[2])}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {award.description && (
                        <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-2">{award.description}</p>
                      )}
                      
                      {/* Evaluation Period and Date */}
                      <div className="mt-auto pt-4 border-t border-slate-100 w-full flex flex-col items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        {award.evaluationPeriod && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full font-bold text-[10px]">
                            Period: {award.evaluationPeriod}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400 font-semibold uppercase tracking-wider">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          Conferred on {formatDate(award.awardDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-lg">
                  {getCategoryName(selectedAchievement.categoryId)}
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-heading">{selectedAchievement.title}</h3>
                <p className="text-xs text-slate-500 font-semibold">{getOrgName(selectedAchievement.organizationId)}</p>
              </div>
              <button
                onClick={() => setSelectedAchievement(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold">DATE & VENUE</p>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {formatDate(selectedAchievement.date)}
                </p>
                <p className="text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {selectedAchievement.place || 'Main Campus'}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold">WHOSE ACHIEVEMENT (ACHIEVER)</p>
                <p className="font-extrabold text-slate-900 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  {selectedAchievement.achieverName || 'Achiever Not Assigned'}
                </p>
                {selectedAchievement.achieverStudentId && (
                  <p className="text-slate-500 text-[10px] font-mono">
                    ID: {selectedAchievement.achieverStudentId}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold">EVALUATION</p>
                <p className="font-bold text-emerald-700 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-emerald-600" />
                  Awarded: {selectedAchievement.awardedPoints} points
                </p>
                <p className="text-slate-500">Status: {selectedAchievement.status}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">ACTIVITY DESCRIPTION</h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{selectedAchievement.description}</p>
            </div>

            {/* Media Proof Preview Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">VERIFIED PROGRAM PROOFS</h4>
              {getMediaForAchievement(selectedAchievement.id).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No proof files attached to this submission.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getMediaForAchievement(selectedAchievement.id).map(med => (
                    <div key={med.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                      {med.proofType === 'photo' ? (
                        <img src={med.fileUrl} alt="Thumbnail" className="w-12 h-12 rounded-lg object-cover border border-slate-200" referrerPolicy="no-referrer" />
                      ) : med.proofType === 'video' ? (
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                          <Film className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{med.fileName}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{med.proofType}</p>
                      </div>
                      <a
                        href={med.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 cursor-pointer"
                        title="Download/View file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedAchievement.reviewNotes && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-1">
                <h4 className="text-xs font-bold text-emerald-900">ADMIN REVIEWER FEEDBACK</h4>
                <p className="text-xs text-emerald-800 italic leading-relaxed">"{selectedAchievement.reviewNotes}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
