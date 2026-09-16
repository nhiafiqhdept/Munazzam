import React, { useState } from 'react';
import { usePortal, SP_Organization, SP_Achievement } from '../../context/PortalContext';
import { Award, Trophy, Star, ChevronRight, FileText, Calendar, MapPin, Eye, Film, Megaphone, HelpCircle, User, Users, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../../utils/helpers';

export interface ViewerDashboardProps {
  currentTab?: 'leaderboard' | 'awards';
  hideTabsHeader?: boolean;
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = ({ currentTab, hideTabsHeader = false }) => {
  const { organizations, achievements, awards, announcements, competitions, categories, mediaAttachments, members } = usePortal();
  
  const [selectedAchievement, setSelectedAchievement] = useState<SP_Achievement | null>(null);
  const [viewTab, setViewTab] = useState<'leaderboard' | 'awards'>(currentTab || 'leaderboard');
  const [leaderboardScope, setLeaderboardScope] = useState<'achievers' | 'organizations'>('achievers');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (currentTab) {
      setViewTab(currentTab);
    }
  }, [currentTab]);

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

  // Filtered & sorted members
  const sortedMembers = [...members]
    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.studentId && m.studentId.toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

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
            onClick={() => setViewTab('leaderboard')}
            className={`py-2.5 sm:py-3.5 px-4 sm:px-6 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              viewTab === 'leaderboard'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Leaderboard & Ranks
          </button>
          <button
            onClick={() => setViewTab('awards')}
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
          {/* Main Leaderboard Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Live Standings
                </h2>
              </div>

              {/* Scope Switcher: Achievers vs Organizations */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
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

            {/* ACHIEVERS LEADERBOARD */}
            {leaderboardScope === 'achievers' && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search achiever name or student ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {sortedMembers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    {searchQuery ? 'No student achievers match your search.' : 'No registered student achievers yet.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sortedMembers.map((member, index) => {
                      const rank = index + 1;
                      return (
                        <div key={member.id} className="flex items-center justify-between py-3.5 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors">
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
                              <p className="font-extrabold text-slate-900 text-sm truncate">{member.name}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                                {member.studentId && (
                                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                    ID: {member.studentId}
                                  </span>
                                )}
                                <span>{getOrgName(member.organizationId)}</span>
                                <span>• {member.approvedAchievementsCount || 0} achievements</span>
                              </div>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right shrink-0 pl-2">
                            <span className="text-base font-black text-emerald-800">{member.totalPoints || 0}</span>
                            <span className="text-[10px] text-slate-500 block font-semibold">POINTS</span>
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
              <>
                {organizations.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No organizations created yet. Check back soon!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {organizations.map((org, index) => {
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
                                <p className="text-xs text-slate-500">{org.className} • Leader: {org.leader || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right">
                            <span className="text-base font-black text-emerald-800">{org.totalPoints || 0}</span>
                            <span className="text-[10px] text-slate-500 block font-semibold">POINTS</span>
                          </div>
                        </div>
                      );
                    })}
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
                Active Evaluation Period
              </h3>
              {competitions.filter(c => c.status === 'active').length === 0 ? (
                <p className="text-xs text-slate-500 leading-normal">There is no active evaluation period currently running. Ranks are based on lifetime points accumulated.</p>
              ) : (
                competitions.filter(c => c.status === 'active').map(comp => (
                  <div key={comp.id} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl space-y-2">
                    <p className="font-bold text-emerald-900 text-xs">{comp.name}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(comp.startDate)} - {formatDate(comp.endDate)}
                    </p>
                  </div>
                ))
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
                  <p className="text-[11px] text-emerald-800 font-bold">Winner: {awards[0].winnerOrganizationName}</p>
                  <p className="text-[10px] text-slate-500 italic">Conferred on {formatDate(awards[0].awardDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Awards Section */}
      {viewTab === 'awards' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Awards & Certifications Gallery</h2>
          {awards.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 text-sm">
              No awards recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {awards.map(award => (
                <div key={award.id} className="bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-16 h-16 bg-amber-50 rounded-bl-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-500 -mt-2 -mr-2" />
                  </div>
                  <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-xl">
                    🏆
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">{award.name}</h3>
                    <p className="text-xs text-emerald-800 font-bold">Winner: {award.winnerOrganizationName}</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{award.description}</p>
                  <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                    Conferred on {formatDate(award.awardDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
