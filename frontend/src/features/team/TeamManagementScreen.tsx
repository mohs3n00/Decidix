import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';

export const TeamManagementScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const {
    teams,
    activeTeam,
    currentWorkspaceType,
    switchWorkspace,
    createTeam,
    addTeamMember,
    removeTeamMember,
    workspaceDatasets,
  } = useWorkspace();
  const toast = useToast();

  const [copied, setCopied] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Add member form
  const [memberInputId, setMemberInputId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Copy User ID to clipboard
  const handleCopyUserId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    toast.show(
      isRTL ? 'تم نسخ معرف المستخدم بنجاح! شاركه مع زميلك.' : 'User ID copied! Share it with your team.',
      'success'
    );
    setTimeout(() => setCopied(false), 3000);
  };

  // Create Team Submit
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      const created = await createTeam(newTeamName, newTeamDesc);
      toast.show(
        isRTL ? `تم إنشاء فريق "${created.name}" بنجاح!` : `Team "${created.name}" created successfully!`,
        'success'
      );
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateModal(false);
    } catch (err: any) {
      toast.show(err?.message || 'Failed to create team', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Add Member Submit
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) {
      toast.show(isRTL ? 'الرجاء اختيار أو إنشاء فريق أولاً.' : 'Select or create a team first.', 'error');
      return;
    }
    if (!memberInputId.trim()) return;

    setIsAdding(true);
    try {
      const added = await addTeamMember(activeTeam.id, memberInputId, memberName);
      toast.show(
        isRTL ? `تمت إضافة "${added.name}" إلى الفريق بنجاح!` : `Added "${added.name}" to the team!`,
        'success'
      );
      setMemberInputId('');
      setMemberName('');
    } catch (err: any) {
      toast.show(err?.message || 'Failed to add member', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberUserId: string, name: string) => {
    if (!activeTeam) return;
    if (confirm(isRTL ? `هل أنت متأكد من إزالة ${name} من الفريق؟` : `Remove ${name} from the team?`)) {
      try {
        await removeTeamMember(activeTeam.id, memberUserId);
        toast.show(isRTL ? 'تمت إزالة العضو من الفريق' : 'Member removed from team', 'info');
      } catch (err: any) {
        toast.show(err?.message || 'Failed to remove member', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'العمل المؤسسي والتعاوني' : 'INSTITUTIONAL COLLABORATION'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#061A3A]">
            {isRTL ? 'فرق العمل والمؤسسات' : 'Teams & Workspaces'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            {isRTL
              ? 'أنشئ فرق عمل مشتركة لمؤسستك أو جهتك البحثية، وأضف زملاءك باستخدام المعرف الخاص بهم لتتشاركوا نفس مجموعات البيانات والتحليلات.'
              : 'Collaborate with colleagues and institutions. Form shared teams, invite members using their unique User ID, and analyze joint datasets together.'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 rounded-xl bg-blue hover:bg-blue-hover text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs shrink-0 self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>{isRTL ? 'إنشاء فريق جديد' : 'Create New Team'}</span>
        </button>
      </div>

      {/* 2. User ID Share Card (Key Innovation for Collaboration) */}
      <div className="p-5 rounded-2xl border border-blue/20 bg-gradient-to-br from-blue/5 via-white to-cyan/5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-[#061A3A]">
                {isRTL ? 'المعرف الشخصي الخاص بك (Your User ID)' : 'Your Personal User ID'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl leading-relaxed">
                {isRTL
                  ? 'شارك هذا المعرف مع زملائك أو مشرف المؤسسة ليتمكنوا من إضافتك إلى فريق عملهم المشترك بنقرة واحدة.'
                  : 'Share this ID with your colleague or supervisor so they can invite you to their institutional team instantly.'}
              </p>
            </div>
          </div>

          {/* Copyable ID Badge */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="font-mono text-xs font-bold text-[#061A3A] tracking-wider select-all">
              {user?.id || 'usr_anonymous'}
            </span>
            <button
              onClick={handleCopyUserId}
              className={`p-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1 ${
                copied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isRTL ? 'نسخ المعرف' : 'Copy User ID'}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[10px]">{isRTL ? 'تم النسخ' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-[10px]">{isRTL ? 'نسخ' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Team Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => switchWorkspace('personal')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            currentWorkspaceType === 'personal'
              ? 'bg-[#061A3A] text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{isRTL ? 'مساحتي الشخصية (فردي)' : 'My Personal Workspace'}</span>
        </button>

        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => switchWorkspace('team', t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              currentWorkspaceType === 'team' && activeTeam?.id === t.id
                ? 'bg-blue text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{t.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                currentWorkspaceType === 'team' && activeTeam?.id === t.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {t.members.length}
            </span>
          </button>
        ))}

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-blue border border-dashed border-blue/30 transition flex items-center gap-1.5 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>{isRTL ? 'إضافة فريق' : 'New Team'}</span>
        </button>
      </div>

      {/* 4. Main Team Content Grid */}
      {currentWorkspaceType === 'team' && activeTeam ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Main Column: Members List & Add Member */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Member Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue/10 text-blue flex items-center justify-center font-bold text-xs">
                  +
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#061A3A]">
                    {isRTL ? 'إضافة زميل بالمعرف إلى الفريق' : 'Add Member by User ID'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isRTL
                      ? 'اطلب من زميلك معرفه الشخصي وقم بلصقه هنا لينضم فوراً للفريق ويتشارك معكم البيانات.'
                      : 'Enter your colleague’s User ID or email to grant them shared access to this workspace.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddMemberSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isRTL ? 'معرف المستخدم (User ID) أو البريد' : 'User ID or Email'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="usr_123456789 or name@domain.com"
                      value={memberInputId}
                      onChange={(e) => setMemberInputId(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isRTL ? 'اسم الزميل (اختياري)' : 'Colleague Name (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={isRTL ? 'د. أحمد محمود' : 'Dr. Ahmed Mahmoud'}
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAdding || !memberInputId.trim()}
                    className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  >
                    {isAdding ? (
                      <span>{isRTL ? 'جارٍ الإضافة...' : 'Adding...'}</span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{isRTL ? 'إضافة إلى الفريق' : 'Add to Team'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Members Roster Table */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#061A3A]">
                    {isRTL ? 'أعضاء الفريق الحاليين' : 'Current Team Members'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isRTL
                      ? `${activeTeam.members.length} أعضاء يشاركون نفس مساحة العمل ومجموعات البيانات`
                      : `${activeTeam.members.length} members collaborating on this workspace`}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue/10 text-blue">
                  {activeTeam.name}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {activeTeam.members.map((member) => (
                  <div key={member.userId} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-[#061A3A] font-bold text-xs flex items-center justify-center border border-slate-200">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#061A3A] flex items-center gap-2">
                          <span>{member.name}</span>
                          {member.userId === user?.id && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                              {isRTL ? 'أنت' : 'You'}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              member.role === 'owner'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-blue/10 text-blue'
                            }`}
                          >
                            {member.role === 'owner'
                              ? isRTL
                                ? 'مالك الفريق'
                                : 'Team Owner'
                              : isRTL
                              ? 'عضو فريق'
                              : 'Team Member'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{member.email}</span>
                          <span>•</span>
                          <span>{member.userId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {activeTeam.ownerId === user?.id && member.userId !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.userId, member.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title={isRTL ? 'إزالة من الفريق' : 'Remove from team'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Shared Workspace Datasets & Info */}
          <div className="space-y-6">
            {/* Team Workspace Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-[#061A3A] mb-2">
                {isRTL ? 'حالة مساحة الفريق' : 'Team Workspace Status'}
              </h3>
              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                {isRTL
                  ? 'أي مجموعة بيانات يقوم أي عضو برفعها هنا تكون متاحة فوراً لجميع أعضاء الفريق، وتظهر في لوحة المتابعة المشتركة.'
                  : 'Datasets uploaded here are instantly accessible to all team members for shared analysis and simulation.'}
              </p>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isRTL ? 'اسم الفريق' : 'Team Name'}</span>
                  <span className="font-bold text-[#061A3A]">{activeTeam.name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isRTL ? 'تاريخ التأسيس' : 'Created'}</span>
                  <span className="font-mono text-slate-500">
                    {new Date(activeTeam.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isRTL ? 'مجموعات البيانات المشتركة' : 'Shared Datasets'}</span>
                  <span className="font-bold text-blue">{workspaceDatasets.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Action to Datasets */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#061A3A] to-[#1E3A8A] text-white shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan mb-1">
                {isRTL ? 'البيانات المشتركة' : 'SHARED DATASETS'}
              </h4>
              <p className="text-xs text-slate-200 mb-4 leading-relaxed">
                {isRTL
                  ? 'انتقل إلى شاشة إدارة البيانات لرفع ملفات جديدة أو تفعيلها لتحليل الفريق.'
                  : 'Upload new CSV/Excel datasets or activate existing ones for this team.'}
              </p>
              <a
                href="/datasets"
                className="w-full h-9 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#061A3A] text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>{isRTL ? 'إدارة بيانات الفريق' : 'Manage Team Datasets'}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Personal Workspace View */
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue/10 text-blue flex items-center justify-center font-bold text-base">
                <DecidixIcon name="user" size={22} color="#0052FF" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#061A3A]">
                  {isRTL ? 'مساحة العمل الشخصية الفردية' : 'Personal Workspace'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRTL
                    ? 'في هذه المساحة، بياناتك وتحليلاتك تكون خاصة بك فقط ولا يستطيع أي شخص آخر الاطلاع عليها.'
                    : 'Your personal workspace: datasets and simulations uploaded here are strictly private to you.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="h-9 px-4 rounded-xl bg-blue hover:bg-blue-hover text-white text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>{isRTL ? 'تحويل إلى عمل مؤسسي (إنشاء فريق)' : 'Create a Team Workspace'}</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isRTL ? 'البيانات المرفوعة' : 'YOUR DATASETS'}
              </div>
              <div className="text-xl font-bold text-[#061A3A]">{workspaceDatasets.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {isRTL ? 'مجموعات بيانات خاصة' : 'Private custom datasets'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isRTL ? 'مستوى الخصوصية' : 'PRIVACY LEVEL'}
              </div>
              <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
                <span>100%</span>
                <span className="text-xs font-semibold text-slate-600">
                  {isRTL ? 'خاص بالكامل' : 'Private'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {isRTL ? 'غير مشتركة مع أي مستخدم آخر' : 'Restricted to your account only'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isRTL ? 'الخطوة التالية' : 'NEXT STEP'}
              </div>
              <a
                href="/datasets"
                className="text-xs font-bold text-blue hover:underline flex items-center gap-1 mt-1"
              >
                <span>{isRTL ? 'رفع ملف بيانات لتحليله' : 'Upload dataset to analyze'}</span>
                <span>→</span>
              </a>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {isRTL ? 'يدعم CSV, Excel, JSON' : 'Supports CSV, Excel, JSON'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#061A3A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue/10 text-blue flex items-center justify-center font-bold text-sm">
                  <DecidixIcon name="users" size={18} color="#0052FF" />
                </div>
                <h3 className="text-base font-bold text-[#061A3A]">
                  {isRTL ? 'إنشاء فريق عمل مؤسسي جديد' : 'Create New Team'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <DecidixIcon name="close" size={16} color="currentColor" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {isRTL
                ? 'أنشئ فريقك الآن، وبعد إنشائه ستتمكن من إضافة زملائك بالمعرف الشخصي ومشاركة نفس مجموعات البيانات والتحليلات.'
                : 'Form a shared workspace for your institution. Invite team members using their unique User ID.'}
            </p>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRTL ? 'اسم الفريق أو المؤسسة' : 'Team / Institution Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRTL ? 'مثال: معهد التخطيط القومي - قطاع الصعيد' : 'e.g. Regional Planning Institute'}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRTL ? 'الوصف التنموي (اختياري)' : 'Description (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isRTL
                      ? 'وصف مبسط لأهداف الفريق ومجال البيانات...'
                      : 'Brief description of the team objectives...'
                  }
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 px-3.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTeamName.trim()}
                  className="h-9 px-4 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  {isCreating ? (
                    <span>{isRTL ? 'جارٍ الإنشاء...' : 'Creating...'}</span>
                  ) : (
                    <span>{isRTL ? 'تأكيد إنشاء الفريق' : 'Create Team'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
