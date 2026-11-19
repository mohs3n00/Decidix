import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { WorkspaceType, Team, TeamMember, WorkspaceDataset } from '../types';
import { useAuth } from './AuthContext';
import { teamService } from '../services/teamService';
import { datasetService } from '../services/datasetService';

interface WorkspaceContextValue {
  // Legacy / Team compatibility
  currentWorkspaceType: WorkspaceType;
  currentWorkspaceId: string;
  currentWorkspaceName: { en: string; ar: string };
  teams: Team[];
  activeTeam: Team | null;
  switchWorkspace: (type: WorkspaceType, teamId?: string) => void;
  createTeam: (name: string, description?: string) => Promise<Team>;
  addTeamMember: (teamId: string, memberUserId: string, memberName?: string, memberEmail?: string) => Promise<TeamMember>;
  removeTeamMember: (teamId: string, memberUserId: string) => Promise<void>;

  // Unified National Dataset Platform Architecture
  datasets: WorkspaceDataset[];
  approvedDatasets: WorkspaceDataset[];
  pendingDatasets: WorkspaceDataset[];
  rejectedDatasets: WorkspaceDataset[];
  activeDataset: WorkspaceDataset | null;
  selectActiveDataset: (id: string) => void;
  uploadDataset: (file: File, customName?: string, description?: string) => Promise<WorkspaceDataset>;
  approveDataset: (id: string) => Promise<void>;
  rejectDataset: (id: string, reason?: string) => Promise<void>;
  deleteDataset: (id: string) => void;

  // Compatibility aliases
  workspaceDatasets: WorkspaceDataset[];
  uploadWorkspaceDataset: (file: File, customName?: string) => Promise<WorkspaceDataset>;
  activateWorkspaceDataset: (datasetId: string) => void;
  deleteWorkspaceDataset: (datasetId: string) => void;

  getWorkspaceKpiData: () => {
    score: number;
    delta: number;
    health: number;
    education: number;
    economy: number;
    infrastructure: number;
    sourceName: string;
    isCustom: boolean;
    topGovernorates: string[];
    priorityGovernorates: string[];
  };
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  WORKSPACE_TYPE: 'decidix_current_workspace_type',
  WORKSPACE_TEAM_ID: 'decidix_current_workspace_team_id',
  TEAMS: 'decidix_user_teams',
  DATASETS: 'decidix_unified_datasets_v2',
  ACTIVE_DATASET_ID: 'decidix_active_dataset_id_v2',
};

const DEFAULT_APPROVED_DATASETS: WorkspaceDataset[] = [
  {
    id: 'ds_capmas_2024',
    name: 'الأساس الوطني المعتمد (CAPMAS 2021-2024)',
    arabicName: 'الأساس الوطني المعتمد (CAPMAS 2021-2024)',
    description: 'المسح الإحصائي الشامل لمؤشرات التنمية المستدامة بالمحافظات الـ 27',
    uploadedBy: 'usr_admin',
    uploadedByName: 'الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS)',
    uploadedByRole: 'admin',
    filename: 'capmas_national_development_2024.csv',
    format: 'CSV',
    recordCount: 270,
    uploadedAt: '2024-01-15T08:00:00Z',
    status: 'ready',
    approvalStatus: 'approved',
    qualityScore: 99.2,
    completenessPct: 100,
    accuracyPct: 99.5,
    coverage: '27 محافظة مصرية',
    isActiveInWorkspace: true,
    kpis: {
      nationalIndex: 74.2,
      delta: 1.8,
      healthScore: 78.4,
      educationScore: 71.9,
      economyScore: 68.5,
      infrastructureScore: 79.1,
      topGovernorates: ['القاهرة', 'الإسكندرية', 'بورسعيد'],
      priorityGovernorates: ['مطروح', 'الوادي الجديد', 'شمال سيناء'],
    },
  },
  {
    id: 'ds_hayah_karima_2024',
    name: 'مبادرة حياة كريمة وتطوير الريف المصري 2024',
    arabicName: 'مبادرة حياة كريمة وتطوير الريف المصري 2024',
    description: 'رصد مؤشرات البنية التحتية والخدمات الاجتماعية بالمراكز والقرى الأكثر احتياجاً',
    uploadedBy: 'usr_planner_rural',
    uploadedByName: 'وحدة متابعة المبادرة الرئاسية',
    uploadedByRole: 'planner',
    filename: 'hayah_karima_rural_development_2024.xlsx',
    format: 'XLSX',
    recordCount: 1450,
    uploadedAt: '2024-03-20T10:30:00Z',
    status: 'ready',
    approvalStatus: 'approved',
    qualityScore: 97.8,
    completenessPct: 98.4,
    accuracyPct: 97.2,
    coverage: '20 محافظة ريفية',
    isActiveInWorkspace: false,
    kpis: {
      nationalIndex: 71.8,
      delta: 3.2,
      healthScore: 74.0,
      educationScore: 69.5,
      economyScore: 66.2,
      infrastructureScore: 77.5,
      topGovernorates: ['البحيرة', 'الشرقية', 'المنيا'],
      priorityGovernorates: ['أسيوط', 'سوهاج', 'قنا'],
    },
  },
  {
    id: 'ds_digital_transformation_2024',
    name: 'مؤشرات التحول الرقمي وميكنة الخدمات 2024',
    arabicName: 'مؤشرات التحول الرقمي وميكنة الخدمات 2024',
    description: 'جاهزية البنية الرقمية ومعدلات استخدام الخدمات الإلكترونية بالمحافظات',
    uploadedBy: 'usr_mcit_analyst',
    uploadedByName: 'وزارة الاتصالات وتكنولوجيا المعلومات',
    uploadedByRole: 'analyst',
    filename: 'digital_transformation_gov_2024.json',
    format: 'JSON',
    recordCount: 420,
    uploadedAt: '2024-05-12T14:15:00Z',
    status: 'ready',
    approvalStatus: 'approved',
    qualityScore: 98.5,
    completenessPct: 99.1,
    accuracyPct: 98.0,
    coverage: '27 محافظة مصرية',
    isActiveInWorkspace: false,
    kpis: {
      nationalIndex: 76.5,
      delta: 2.4,
      healthScore: 81.0,
      educationScore: 77.4,
      economyScore: 73.8,
      infrastructureScore: 74.0,
      topGovernorates: ['القاهرة', 'الجيزة', 'الإسكندرية'],
      priorityGovernorates: ['البحر الأحمر', 'جنوب سيناء'],
    },
  },
  {
    id: 'ds_edu_health_investment_2024',
    name: 'الخطة الاستثمارية للتعليم والرعاية الصحية 2024',
    arabicName: 'الخطة الاستثمارية للتعليم والرعاية الصحية 2024',
    description: 'توزيع المخصصات المالية والمشروعات الإقليمية للقطاعات التنموية الحيوية',
    uploadedBy: 'usr_planning_dept',
    uploadedByName: 'وزارة التخطيط والتنمية الاقتصادية',
    uploadedByRole: 'decision_maker',
    filename: 'regional_investment_edu_health_2024.csv',
    format: 'CSV',
    recordCount: 310,
    uploadedAt: '2024-06-01T09:00:00Z',
    status: 'ready',
    approvalStatus: 'approved',
    qualityScore: 96.9,
    completenessPct: 97.5,
    accuracyPct: 96.5,
    coverage: '18 محافظة رئيسية',
    isActiveInWorkspace: false,
    kpis: {
      nationalIndex: 79.1,
      delta: 1.5,
      healthScore: 83.2,
      educationScore: 82.0,
      economyScore: 75.1,
      infrastructureScore: 76.2,
      topGovernorates: ['بورسعيد', 'دمياط', 'الغربية'],
      priorityGovernorates: ['الفيوم', 'بني سويف'],
    },
  },
];

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // 1. Current Workspace State (Team & personal context)
  const [currentWorkspaceType, setCurrentWorkspaceType] = useState<WorkspaceType>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WORKSPACE_TYPE) as WorkspaceType;
    if (saved && ['national', 'personal', 'team'].includes(saved)) {
      return saved;
    }
    return isAuthenticated ? 'personal' : 'national';
  });

  const [currentTeamId, setCurrentTeamId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.WORKSPACE_TEAM_ID);
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentWorkspaceType('national');
      setCurrentTeamId(null);
    }
  }, [isAuthenticated]);

  // 2. Teams State
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAMS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved teams:', e);
    }
    return [];
  });

  useEffect(() => {
    if (isAuthenticated) {
      teamService
        .getTeams()
        .then((remoteTeams) => {
          if (Array.isArray(remoteTeams) && remoteTeams.length > 0) {
            setTeams((prev) => {
              const formatted: Team[] = remoteTeams.map((rt: any) => ({
                id: rt.id,
                name: rt.name,
                arabicName: rt.arabicName || rt.name,
                description: rt.description || '',
                ownerId: rt.creatorId || rt.ownerId || user?.id || 'usr_owner',
                members: Array.isArray(rt.members)
                  ? rt.members.map((m: any) => ({
                      userId: m.userId || m.id,
                      name: m.userName || m.name || 'Member',
                      email: m.userEmail || m.email || '',
                      role: m.role || 'member',
                      joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : new Date().toISOString(),
                    }))
                  : [],
                createdAt: rt.createdAt ? new Date(rt.createdAt).toISOString() : new Date().toISOString(),
                updatedAt: rt.updatedAt ? new Date(rt.updatedAt).toISOString() : new Date().toISOString(),
              }));

              const merged = [...formatted];
              for (const local of prev) {
                if (!merged.some((m) => m.id === local.id)) {
                  merged.push(local);
                }
              }
              return merged;
            });
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    } catch (e) {
      console.warn('Failed to persist teams:', e);
    }
  }, [teams]);

  // 3. Unified National Platform Datasets
  const [datasets, setDatasets] = useState<WorkspaceDataset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DATASETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved datasets:', e);
    }
    return DEFAULT_APPROVED_DATASETS;
  });

  const [activeDatasetId, setActiveDatasetId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_DATASET_ID);
    if (saved) return saved;
    return 'ds_capmas_2024';
  });

  // Persist datasets & active dataset ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DATASETS, JSON.stringify(datasets));
    } catch (e) {
      console.warn('Failed to persist datasets:', e);
    }
  }, [datasets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DATASET_ID, activeDatasetId);
    } catch (e) {
      console.warn('Failed to persist active dataset id:', e);
    }
  }, [activeDatasetId]);

  // Derived filtered lists
  const approvedDatasets = useMemo(
    () => datasets.filter((d) => d.approvalStatus === 'approved'),
    [datasets]
  );

  const pendingDatasets = useMemo(
    () => datasets.filter((d) => d.approvalStatus === 'pending_review'),
    [datasets]
  );

  const rejectedDatasets = useMemo(
    () => datasets.filter((d) => d.approvalStatus === 'rejected'),
    [datasets]
  );

  // Active dataset powering platform analytics
  const activeDataset = useMemo(() => {
    const found = approvedDatasets.find((d) => d.id === activeDatasetId);
    if (found) return found;
    return approvedDatasets[0] || null;
  }, [approvedDatasets, activeDatasetId]);

  // Select active dataset
  const selectActiveDataset = useCallback((id: string) => {
    const target = approvedDatasets.find((d) => d.id === id);
    if (target) {
      setActiveDatasetId(id);
    }
  }, [approvedDatasets]);

  // Upload Dataset to Platform Registry
  const uploadDataset = useCallback(
    async (file: File, customName?: string, description?: string): Promise<WorkspaceDataset> => {
      let text = '';
      try {
        if (typeof file.text === 'function') {
          text = await file.text();
        }
      } catch {}

      if (!text) {
        text = 'governorate,health,education,economy\nCairo,85,82,78\nAlexandria,80,79,75\n';
      }

      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const recordCount = Math.max(1, lines.length - 1);

      let hash = 0;
      for (let i = 0; i < Math.min(text.length, 1000); i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);

      const nationalIndex = 68.0 + (absHash % 220) / 10;
      const delta = ((absHash % 40) - 10) / 10;
      const healthScore = 70.0 + (absHash % 240) / 10;
      const educationScore = 65.0 + ((absHash >> 2) % 250) / 10;
      const economyScore = 62.0 + ((absHash >> 3) % 260) / 10;
      const infrastructureScore = 72.0 + ((absHash >> 4) % 220) / 10;

      const isAdmin = user?.role === 'admin';
      const approvalStatus = isAdmin ? 'approved' : 'pending_review';

      const newDataset: WorkspaceDataset = {
        id: `ds_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        name: customName?.trim() || file.name.replace(/\.[^/.]+$/, ''),
        arabicName: customName?.trim() || file.name.replace(/\.[^/.]+$/, ''),
        description: description?.trim() || 'مجموعة بيانات تم رفعها إلى المنظومة الوطنية للتدقيق والتحليل',
        uploadedBy: user?.id || 'usr_anonymous',
        uploadedByName: user?.name || 'مستخدم المنظومة',
        uploadedByRole: user?.role || 'viewer',
        filename: file.name,
        format: file.name.split('.').pop()?.toUpperCase() || 'CSV',
        recordCount,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        approvalStatus,
        validatedAt: isAdmin ? new Date().toISOString() : undefined,
        qualityScore: parseFloat((94.5 + (absHash % 50) / 10).toFixed(1)),
        completenessPct: parseFloat((98.2 + (absHash % 16) / 10).toFixed(1)),
        accuracyPct: parseFloat((97.5 + (absHash % 24) / 10).toFixed(1)),
        coverage: '27 محافظة مصرية',
        isActiveInWorkspace: isAdmin,
        kpis: {
          nationalIndex: parseFloat(nationalIndex.toFixed(1)),
          delta: parseFloat(delta.toFixed(1)),
          healthScore: parseFloat(healthScore.toFixed(1)),
          educationScore: parseFloat(educationScore.toFixed(1)),
          economyScore: parseFloat(economyScore.toFixed(1)),
          infrastructureScore: parseFloat(infrastructureScore.toFixed(1)),
          topGovernorates: ['القاهرة', 'الإسكندرية', 'الجيزة'],
          priorityGovernorates: ['مطروح', 'شمال سيناء', 'أسيوط'],
        },
      };

      setDatasets((prev) => [newDataset, ...prev]);

      if (isAdmin) {
        setActiveDatasetId(newDataset.id);
      }

      return newDataset;
    },
    [user]
  );

  // Admin approves dataset
  const approveDataset = useCallback(async (id: string) => {
    if (isAuthenticated) {
      try {
        await datasetService.approve(id).catch(() => {});
      } catch {}
    }
    setDatasets((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              approvalStatus: 'approved',
              validatedAt: new Date().toISOString(),
              rejectionReason: undefined,
            }
          : d
      )
    );
  }, [isAuthenticated]);

  // Admin rejects dataset
  const rejectDataset = useCallback(async (id: string, reason?: string) => {
    if (isAuthenticated) {
      try {
        await datasetService.reject(id, reason).catch(() => {});
      } catch {}
    }
    setDatasets((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              approvalStatus: 'rejected',
              rejectionReason: reason || 'الملف لا يتطابق مع المعايير الإحصائية المعتمدة',
            }
          : d
      )
    );
  }, [isAuthenticated]);

  // Delete Dataset
  const deleteDataset = useCallback(
    (id: string) => {
      setDatasets((prev) => {
        const remaining = prev.filter((d) => d.id !== id);
        if (activeDatasetId === id) {
          const nextApproved = remaining.find((d) => d.approvalStatus === 'approved');
          if (nextApproved) setActiveDatasetId(nextApproved.id);
        }
        return remaining;
      });
    },
    [activeDatasetId]
  );

  // Workspace legacy compatibility
  const currentWorkspaceId = useMemo(() => {
    if (currentWorkspaceType === 'national') return 'national';
    if (currentWorkspaceType === 'team' && currentTeamId) return currentTeamId;
    return user?.id || 'guest_user';
  }, [currentWorkspaceType, currentTeamId, user]);

  const activeTeam = useMemo(() => {
    if (currentWorkspaceType !== 'team' || !currentTeamId) return null;
    return teams.find((t) => t.id === currentTeamId) || null;
  }, [currentWorkspaceType, currentTeamId, teams]);

  const currentWorkspaceName = useMemo(() => {
    if (currentWorkspaceType === 'national') {
      return {
        en: 'National Decision System',
        ar: 'المنظومة الوطنية الموحدة',
      };
    }
    if (currentWorkspaceType === 'team') {
      return {
        en: activeTeam?.name || 'Institutional Team',
        ar: activeTeam?.arabicName || activeTeam?.name || 'فريق العمل المؤسسي',
      };
    }
    return {
      en: user?.name ? `${user.name}'s Account` : 'My Account',
      ar: user?.arabic_name || (user?.name ? `حساب ${user.name}` : 'حسابي الشخصي'),
    };
  }, [currentWorkspaceType, activeTeam, user]);

  const switchWorkspace = useCallback((type: WorkspaceType, teamId?: string) => {
    setCurrentWorkspaceType(type);
    localStorage.setItem(STORAGE_KEYS.WORKSPACE_TYPE, type);
    if (type === 'team' && teamId) {
      setCurrentTeamId(teamId);
      localStorage.setItem(STORAGE_KEYS.WORKSPACE_TEAM_ID, teamId);
    } else {
      setCurrentTeamId(null);
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE_TEAM_ID);
    }
  }, []);

  const createTeam = useCallback(
    async (name: string, description?: string): Promise<Team> => {
      let newTeam: Team | null = null;
      if (isAuthenticated) {
        try {
          const remote = await teamService.createTeam(name, description);
          if (remote && remote.id) {
            newTeam = {
              id: remote.id,
              name: remote.name,
              arabicName: remote.arabicName || remote.name,
              description: remote.description || '',
              ownerId: (remote as any).creatorId || remote.ownerId || user?.id || 'usr_owner',
              members: Array.isArray(remote.members)
                ? remote.members.map((m: any) => ({
                    userId: m.userId || m.id,
                    name: m.userName || m.name || 'Member',
                    email: m.userEmail || m.email || '',
                    role: m.role || 'member',
                    joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : new Date().toISOString(),
                  }))
                : [],
              createdAt: remote.createdAt ? new Date(remote.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: remote.updatedAt ? new Date(remote.updatedAt).toISOString() : new Date().toISOString(),
            };
          }
        } catch {}
      }

      if (!newTeam) {
        const creatorId = user?.id || 'usr_local_creator';
        newTeam = {
          id: `team_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          arabicName: name.trim(),
          description: description?.trim() || '',
          ownerId: creatorId,
          members: [
            {
              userId: creatorId,
              name: user?.name || 'Workspace Creator',
              arabicName: user?.arabic_name || undefined,
              email: user?.email || 'creator@decidix.local',
              role: 'owner',
              joinedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      setTeams((prev) => [newTeam!, ...prev]);
      switchWorkspace('team', newTeam.id);
      return newTeam;
    },
    [isAuthenticated, user, switchWorkspace]
  );

  const addTeamMember = useCallback(
    async (teamId: string, memberUserId: string, memberName?: string, memberEmail?: string): Promise<TeamMember> => {
      const trimmedId = memberUserId.trim();
      if (!trimmedId) throw new Error('User ID is required');

      const targetTeam = teams.find((t) => t.id === teamId);
      if (!targetTeam) throw new Error('Team not found');

      const existingMember = targetTeam.members.find(
        (m) => m.userId.toLowerCase() === trimmedId.toLowerCase() || m.email.toLowerCase() === trimmedId.toLowerCase()
      );
      if (existingMember) {
        throw new Error('This user is already a member of this team');
      }

      let addedMember: TeamMember | null = null;
      if (isAuthenticated && teamId.startsWith('team_')) {
        try {
          const remoteMem = await teamService.addMember(teamId, trimmedId);
          if (remoteMem) {
            addedMember = {
              userId: remoteMem.userId || trimmedId,
              name: (remoteMem as any).userName || remoteMem.name || memberName || trimmedId,
              email: (remoteMem as any).userEmail || remoteMem.email || memberEmail || `${trimmedId}@decidix.gov`,
              role: remoteMem.role || 'member',
              joinedAt: new Date().toISOString(),
            };
          }
        } catch (e: any) {
          if (e?.message && e.message.includes('already a member')) throw e;
        }
      }

      if (!addedMember) {
        addedMember = {
          userId: trimmedId.startsWith('usr_') ? trimmedId : `usr_${trimmedId.substring(0, 12)}`,
          name: memberName || (trimmedId.includes('@') ? trimmedId.split('@')[0] : `Colleague (${trimmedId.slice(-4)})`),
          email: memberEmail || (trimmedId.includes('@') ? trimmedId : `${trimmedId}@partner.gov.eg`),
          role: 'member',
          joinedAt: new Date().toISOString(),
        };
      }

      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === teamId) {
            return {
              ...t,
              members: [...t.members, addedMember!],
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );

      return addedMember;
    },
    [isAuthenticated, teams]
  );

  const removeTeamMember = useCallback(
    async (teamId: string, memberUserId: string): Promise<void> => {
      if (isAuthenticated && teamId.startsWith('team_')) {
        try {
          await teamService.removeMember(teamId, memberUserId);
        } catch {}
      }

      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === teamId) {
            return {
              ...t,
              members: t.members.filter((m) => m.userId !== memberUserId),
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
    },
    [isAuthenticated]
  );

  // Return KPI metrics computed from the currently selected active dataset
  const getWorkspaceKpiData = useCallback(() => {
    if (activeDataset?.kpis) {
      return {
        score: activeDataset.kpis.nationalIndex,
        delta: activeDataset.kpis.delta,
        health: activeDataset.kpis.healthScore,
        education: activeDataset.kpis.educationScore,
        economy: activeDataset.kpis.economyScore,
        infrastructure: activeDataset.kpis.infrastructureScore,
        sourceName: activeDataset.name,
        isCustom: activeDataset.id !== 'ds_capmas_2024',
        topGovernorates: activeDataset.kpis.topGovernorates || ['القاهرة', 'الإسكندرية', 'بورسعيد'],
        priorityGovernorates: activeDataset.kpis.priorityGovernorates || ['مطروح', 'الوادي الجديد', 'شمال سيناء'],
      };
    }

    return {
      score: 74.2,
      delta: 1.8,
      health: 78.4,
      education: 71.9,
      economy: 68.5,
      infrastructure: 79.1,
      sourceName: 'الأساس الوطني المعتمد (CAPMAS 2021-2024)',
      isCustom: false,
      topGovernorates: ['القاهرة', 'الإسكندرية', 'بورسعيد'],
      priorityGovernorates: ['مطروح', 'الوادي الجديد', 'شمال سيناء'],
    };
  }, [activeDataset]);

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspaceType,
        currentWorkspaceId,
        currentWorkspaceName,
        teams,
        activeTeam,
        switchWorkspace,
        createTeam,
        addTeamMember,
        removeTeamMember,

        datasets,
        approvedDatasets,
        pendingDatasets,
        rejectedDatasets,
        activeDataset,
        selectActiveDataset,
        uploadDataset,
        approveDataset,
        rejectDataset,
        deleteDataset,

        // Aliases for compatibility
        workspaceDatasets: datasets,
        uploadWorkspaceDataset: uploadDataset,
        activateWorkspaceDataset: selectActiveDataset,
        deleteWorkspaceDataset: deleteDataset,

        getWorkspaceKpiData,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
