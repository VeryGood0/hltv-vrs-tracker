// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useState, useMemo } from 'react';
import {
  Team,
  TournamentMode,
  MatchFormat,
  TournamentState,
  TournamentTier,
  StageFormatSettings
} from '../types';
import { TeamLogo } from './TeamLogo';
import { createCustomTournament } from '../utils/tournament';
import { OpeningPairsEditor } from './OpeningPairsEditor';
import { applyOpeningPairOrders, type OpeningPairOrders } from '../utils/openingPairs';
import { soundFx } from '../utils/audio';
import {
  X,
  Trophy,
  Sparkles,
  Dices,
  Check,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  DollarSign,
  Shield,
  Building,
  Sliders,
  Flame,
  Award,
  Users
} from 'lucide-react';

interface CreateTournamentModalProps {
  teams: Team[];
  onClose: () => void;
  onCreateTournament: (tournament: TournamentState) => void;
}

interface TournamentPreset {
  id: string;
  name: string;
  shortName: string;
  organizer: string;
  prizePool: string;
  tier: TournamentTier;
  description: string;
  mode: TournamentMode;
  teamCount: number;
  stageFormats: StageFormatSettings;
}

export const TOURNAMENT_TIERS: {
  id: TournamentTier;
  label: string;
  badge: string;
  vrsEstimate: string;
  description: string;
  bgGradient: string;
  borderColor: string;
}[] = [
  {
    id: 'Major',
    label: 'Valve Major',
    badge: 'MAJOR',
    vrsEstimate: '+380..520 VRS',
    description: 'Официальный Чемпионат Мира от Valve. Высшая точка киберспорта с максимальной наградой очков и престижем.',
    bgGradient: 'from-purple-900/40 via-purple-950/20 to-slate-900',
    borderColor: 'border-purple-500/50'
  },
  {
    id: 'S-Tier',
    label: 'S-Tier (Elite)',
    badge: 'S-TIER',
    vrsEstimate: '+260..350 VRS',
    description: 'Элитный LAN-турнир: IEM Katowice/Cologne, BLAST World Final, ESL Pro League.',
    bgGradient: 'from-amber-900/40 via-amber-950/20 to-slate-900',
    borderColor: 'border-amber-500/50'
  },
  {
    id: 'A-Tier',
    label: 'A-Tier (Championship)',
    badge: 'A-TIER',
    vrsEstimate: '+140..220 VRS',
    description: 'Крупный чемпионат: BetBoom Dacha, Roobet Cup, Skyesports Masters.',
    bgGradient: 'from-yellow-900/30 via-slate-900 to-slate-900',
    borderColor: 'border-yellow-500/40'
  },
  {
    id: 'B-Tier',
    label: 'B-Tier (Challenger)',
    badge: 'B-TIER',
    vrsEstimate: '+75..120 VRS',
    description: 'Тир-2 лига: ESL Challenger, CCT Global Finals, региональные RMR квалификации.',
    bgGradient: 'from-blue-900/30 via-slate-900 to-slate-900',
    borderColor: 'border-blue-500/40'
  },
  {
    id: 'Community',
    label: 'C-Tier / Community',
    badge: 'COMMUNITY',
    vrsEstimate: '+35..65 VRS',
    description: 'Локальный кубок, открытая квалификация или фанатский шоу-турнир.',
    bgGradient: 'from-slate-800/40 via-slate-900 to-slate-900',
    borderColor: 'border-slate-700'
  }
];

const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    id: 'agerapvp',
    name: 'AgeraPVP Championship 2026',
    shortName: 'AGERA 2026',
    organizer: 'Agera Gaming',
    prizePool: '$1,250,000',
    tier: 'S-Tier',
    description: 'Главный флагманский турнир 2026 года: 16 команд, швейцарская система до 3 побед и плей-офф Top-8 Single Elimination с гранд-финалом BO5.',
    mode: 'swiss_playoffs',
    teamCount: 16,
    stageFormats: {
      swissNormalFormat: 'BO1',
      swissDeciderFormat: 'BO3',
      quarterfinalFormat: 'BO3',
      semifinalFormat: 'BO3',
      finalFormat: 'BO5'
    }
  },
  {
    id: 'major',
    name: 'Valve CS2 Major Championship 2026',
    shortName: 'MAJOR 2026',
    organizer: 'PGL / Valve',
    prizePool: '$1,250,000',
    tier: 'Major',
    description: 'Valve Major на 32 команды: 16 начинают Stage 1, по 8 команд получают прямой слот в Stage 2 и Stage 3. Из каждой швейцарки проходят 8, затем плей-офф Top 8.',
    mode: 'major',
    teamCount: 32,
    stageFormats: {
      majorStage1NormalFormat: 'BO1',
      majorStage1DeciderFormat: 'BO3',
      majorStage2NormalFormat: 'BO1',
      majorStage2DeciderFormat: 'BO3',
      majorStage3NormalFormat: 'BO3',
      majorStage3DeciderFormat: 'BO3',
      swissNormalFormat: 'BO1',
      swissDeciderFormat: 'BO3',
      quarterfinalFormat: 'BO3',
      semifinalFormat: 'BO3',
      finalFormat: 'BO5'
    }
  },
  {
    id: 'iem',
    name: 'Intel Extreme Masters Katowice 2026',
    shortName: 'IEM KATO',
    organizer: 'ESL',
    prizePool: '$1,000,000',
    tier: 'S-Tier',
    description: 'Легендарный турнир в Сподеке. GSL-группы и плей-офф с гранд-финалом BO5.',
    mode: 'gsl_groups',
    teamCount: 16,
    stageFormats: {
      groupFormat: 'BO3',
      quarterfinalFormat: 'BO3',
      semifinalFormat: 'BO3',
      finalFormat: 'BO5'
    }
  },
  {
    id: 'blast',
    name: 'BLAST Premier World Final 2026',
    shortName: 'BLAST WF',
    organizer: 'BLAST',
    prizePool: '$1,000,000',
    tier: 'S-Tier',
    description: 'Элитный финал года для 8 сильнейших команд с системой Double Elimination (верхняя и нижняя сетка).',
    mode: 'double_elimination',
    teamCount: 8,
    stageFormats: {
      quarterfinalFormat: 'BO3',
      semifinalFormat: 'BO3',
      finalFormat: 'BO5'
    }
  },
  {
    id: 'epl',
    name: 'ESL Pro League Season 21',
    shortName: 'EPL S21',
    organizer: 'ESL',
    prizePool: '$750,000',
    tier: 'S-Tier',
    description: 'Групповой этап с 4 группами по 4 команды с выходом в плей-офф.',
    mode: 'groups_playoffs',
    teamCount: 16,
    stageFormats: {
      groupFormat: 'BO3',
      quarterfinalFormat: 'BO3',
      semifinalFormat: 'BO3',
      finalFormat: 'BO5'
    }
  },
  {
    id: 'single_cup',
    name: 'CS2 Masters Cup (Single Elimination)',
    shortName: 'CUP 8',
    organizer: 'StarLadder',
    prizePool: '$500,000',
    tier: 'A-Tier',
    description: 'Классическая олимпийская сетка на выбывание на 8 команд. Каждый матч имеет решающее значение.',
    mode: 'single_elimination',
    teamCount: 8,
    stageFormats: {
      quarterfinalFormat: 'BO3',
      semifinalFormat: 'BO3',
      finalFormat: 'BO5'
    }
  },
  {
    id: 'round_robin',
    name: 'All-Star Round Robin Championship',
    shortName: 'ROUND ROBIN',
    organizer: 'Agera Esports',
    prizePool: '$300,000',
    tier: 'B-Tier',
    description: 'Круговой турнир: каждая команда играет с каждой. Победитель определяется по сумме очков и разнице карт.',
    mode: 'round_robin',
    teamCount: 6,
    stageFormats: {
      groupFormat: 'BO1',
      finalFormat: 'BO3'
    }
  }
];

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  teams,
  onClose,
  onCreateTournament
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Tournament Basic Info
  const [name, setName] = useState('AgeraPVP Championship 2026');
  const [shortName, setShortName] = useState('AGERA 2026');
  const [organizer, setOrganizer] = useState('Agera Gaming');
  const [prizePool, setPrizePool] = useState('$1,250,000');
  const [tier, setTier] = useState<TournamentTier>('S-Tier');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(
    'Полноценный чемпионат CS2 с системой Map Veto, реалистичными раундами MR12 и динамическим обновлением VRS рейтинга.'
  );

  // Format Settings
  const [mode, setMode] = useState<TournamentMode>('swiss_playoffs');
  const [teamCount, setTeamCount] = useState<number>(16);
  const [groupCount, setGroupCount] = useState<number>(2);
  const [groupStyle, setGroupStyle] = useState<'gsl' | 'gsl_classic_4' | 'gsl_double_elim_8' | 'gsl_top3' | 'round_robin'>('gsl');
  const [openingPairOrders, setOpeningPairOrders] = useState<OpeningPairOrders>({});
  // Optional manual group assignment; unassigned teams use the default snake draw.
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string>>({});
  const [includeThirdPlace, setIncludeThirdPlace] = useState(true);

  // Stage Formats
  const [stageFormats, setStageFormats] = useState<StageFormatSettings>({
    swissNormalFormat: 'BO1',
    swissDeciderFormat: 'BO3',
    quarterfinalFormat: 'BO3',
    semifinalFormat: 'BO3',
    finalFormat: 'BO5',
    groupFormat: 'BO3',
    playoffType: 'single_elimination'
  });

  // Selected Teams & Seeding (Array of team IDs ordered by seed: index 0 = Seed 1)
  const defaultSortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.points - a.points);
  }, [teams]);

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => {
    return defaultSortedTeams.slice(0, 16).map((t) => t.id);
  });
  const [majorStageAssignments, setMajorStageAssignments] = useState<Record<string, 1 | 2 | 3>>({});

  // Best-rated 8 → Stage 3, next 8 → Stage 2, remaining 16 → Stage 1.
  const getDefaultMajorStageAssignments = (teamIds: string[]): Record<string, 1 | 2 | 3> => {
    const pts = (id: string) => teams.find((t) => t.id === id)?.points ?? 0;
    const sorted = [...teamIds].sort((a, b) => pts(b) - pts(a));
    return Object.fromEntries(sorted.map((teamId, index) => [teamId, index < 8 ? 3 : index < 16 ? 2 : 1]));
  };

  const getEffectiveMajorStageAssignments = (
    teamIds: string[],
    assignments: Record<string, 1 | 2 | 3>
  ): Record<string, 1 | 2 | 3> => {
    const capacities = { 1: 16, 2: 8, 3: 8 } as const;
    const counts = { 1: 0, 2: 0, 3: 0 };
    const resolved: Record<string, 1 | 2 | 3> = {};
    teamIds.forEach((teamId) => {
      const stage = assignments[teamId];
      if (stage && counts[stage] < capacities[stage]) {
        resolved[teamId] = stage;
        counts[stage] += 1;
      }
    });
    teamIds.forEach((teamId, index) => {
      if (resolved[teamId]) return;
      const preferred: 1 | 2 | 3 = index < 16 ? 1 : index < 24 ? 2 : 3;
      const target = counts[preferred] < capacities[preferred]
        ? preferred
        : ([1, 2, 3] as const).find((stage) => counts[stage] < capacities[stage]) || 3;
      resolved[teamId] = target;
      counts[target] += 1;
    });
    return resolved;
  };

  const effectiveMajorStageAssignments = useMemo(
    () => getEffectiveMajorStageAssignments(selectedTeamIds, majorStageAssignments),
    [selectedTeamIds, majorStageAssignments, teams]
  );
  const majorStageCounts = {
    1: selectedTeamIds.filter((id) => effectiveMajorStageAssignments[id] === 1).length,
    2: selectedTeamIds.filter((id) => effectiveMajorStageAssignments[id] === 2).length,
    3: selectedTeamIds.filter((id) => effectiveMajorStageAssignments[id] === 3).length
  };
  const isMajorAllocationValid = mode !== 'major' || (
    selectedTeamIds.length === 32 && majorStageCounts[1] === 16 && majorStageCounts[2] === 8 && majorStageCounts[3] === 8
  );
  const isBlastTeamCountValid = mode !== 'blast_bounty' || (teamCount === 32 && selectedTeamIds.length === 32);

  const isGroupTournament = mode === 'gsl_groups' || mode === 'groups_playoffs';
  const usesGslGroups = mode === 'gsl_groups' || (mode === 'groups_playoffs' && groupStyle !== 'round_robin');
  const teamsPerGroup = selectedTeamIds.length / groupCount;
  const groupSizeLabel = Number.isInteger(teamsPerGroup) ? `по ${teamsPerGroup} команд` : 'неравное число команд';
  const fixedGslTeamCount = groupStyle === 'gsl_classic_4' ? groupCount * 4 : groupStyle === 'gsl_double_elim_8' ? 16 : null;
  const thirdPlaceRequired = stageFormats.playoffType !== 'double_elimination'
    && usesGslGroups && groupCount === 2 && teamsPerGroup === 8 && teamCount === 16
    && (groupStyle === 'gsl_double_elim_8' || groupStyle === 'gsl');
  const groupTeamCountOptions = (mode === 'major' || mode === 'blast_bounty')
    ? [32]
    : mode === 'double_elimination'
      ? [8, 16]
      : !isGroupTournament
        ? [4, 6, 8, 12, 16, 24, 32]
        : groupStyle === 'gsl_classic_4'
          ? [groupCount * 4]
          : groupStyle === 'gsl_double_elim_8'
            ? [16]
            : groupStyle === 'gsl_top3'
              ? [groupCount * 4]
              : (groupCount === 2 ? [8, 16] : [16]);
  const isGroupLayoutValid = !isGroupTournament || (
    selectedTeamIds.length >= groupCount * 2 &&
    selectedTeamIds.length % groupCount === 0 &&
    (fixedGslTeamCount !== null
      ? (groupStyle === 'gsl_classic_4'
          ? [2, 4].includes(groupCount) && teamCount === groupCount * 4 && selectedTeamIds.length === groupCount * 4
          : groupCount === 2 && teamCount === fixedGslTeamCount && selectedTeamIds.length === fixedGslTeamCount)
      : (!usesGslGroups || (groupStyle === 'gsl_top3' ? teamsPerGroup === 4 : [4, 8].includes(teamsPerGroup))))
  );

  // Resolve the visible group for every selected team and freeze it before reseeding.
  // This keeps manually assigned groups balanced when the seed order changes.
  const getEffectiveGroupAssignments = (
    teamIds: string[],
    assignments: Record<string, string>,
    numberOfGroups: number
  ): Record<string, string> => {
    const letters = 'ABCDEFGH'.slice(0, numberOfGroups).split('');
    return Object.fromEntries(teamIds.map((teamId, index) => {
      const current = assignments[teamId];
      if (current && letters.includes(current)) return [teamId, current];
      const round = Math.floor(index / numberOfGroups);
      const position = round % 2 === 0 ? index % numberOfGroups : numberOfGroups - 1 - (index % numberOfGroups);
      return [teamId, letters[position] || 'A'];
    }));
  };

  // Filters for Team Picker
  const [searchTeam, setSearchTeam] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // Handle Preset Selection
  const handleApplyPreset = (preset: TournamentPreset) => {
    soundFx.playClick();
    setName(preset.name);
    setShortName(preset.shortName);
    setOrganizer(preset.organizer);
    setPrizePool(preset.prizePool);
    setTier(preset.tier);
    setDescription(preset.description);
    setMode(preset.mode);
    setTeamCount(preset.teamCount);
    setStageFormats({ ...preset.stageFormats, playoffType: preset.stageFormats.playoffType || 'single_elimination' });
    setGroupAssignments({});

    // Pick top teams for this preset
    const needed = preset.teamCount;
    const presetTeamIds = defaultSortedTeams.slice(0, needed).map((t) => t.id);
    setSelectedTeamIds(presetTeamIds);
    setMajorStageAssignments(preset.mode === 'major' ? getDefaultMajorStageAssignments(presetTeamIds) : {});
    if (preset.mode === 'major') setIncludeThirdPlace(false);

    if (preset.mode === 'gsl_groups' || preset.mode === 'groups_playoffs') {
      const presetGroups = preset.stageFormats.groupCount || (preset.mode === 'groups_playoffs' && preset.teamCount >= 16 ? 4 : 2);
      setGroupCount(presetGroups);
      const presetStyle = preset.stageFormats.groupStyle || (preset.mode === 'gsl_groups'
        ? (preset.teamCount >= 16 ? 'gsl_double_elim_8' : 'gsl_classic_4')
        : 'round_robin');
      setGroupStyle(presetStyle);
    }
  };

  // Select the dedicated Major format from the featured format card.
  // Keep this separate from the ordinary Swiss format so the three-stage flow is obvious.
  const handleSelectMajorMode = () => {
    soundFx.playClick();
    const majorTeamIds = defaultSortedTeams.slice(0, 32).map((team) => team.id);
    setMode('major');
    setName((currentName) => currentName.toLowerCase().includes('major') ? currentName : 'Valve CS2 Major Championship 2026');
    setShortName('MAJOR 2026');
    setTier('Major');
    setDescription('32 команд: 16 начинают Stage 1, 8 получают прямой слот в Stage 2 и 8 — в Stage 3. Из каждой швейцарки выходят 8 команд; затем плей-офф Top 8.');
    setTeamCount(32);
    setSelectedTeamIds(majorTeamIds);
    setMajorStageAssignments(getDefaultMajorStageAssignments(majorTeamIds));
    setGroupAssignments({});
    setIncludeThirdPlace(false);
    setStageFormats((previous) => ({
      ...previous,
      majorStage1NormalFormat: previous.majorStage1NormalFormat || 'BO1',
      majorStage1DeciderFormat: previous.majorStage1DeciderFormat || 'BO3',
      majorStage2NormalFormat: previous.majorStage2NormalFormat || 'BO1',
      majorStage2DeciderFormat: previous.majorStage2DeciderFormat || 'BO3',
      majorStage3NormalFormat: previous.majorStage3NormalFormat || 'BO3',
      majorStage3DeciderFormat: previous.majorStage3DeciderFormat || 'BO3',
      quarterfinalFormat: previous.quarterfinalFormat || 'BO3',
      semifinalFormat: previous.semifinalFormat || 'BO3',
      finalFormat: previous.finalFormat || 'BO5'
    }));
  };

  // Adjust team count
  const handleSetTeamCount = (count: number, playSound = true) => {
    // The Major UI itself restricts teamCount to 32. Do not guard using `mode` here:
    // callers that switch modes update React state asynchronously, so this closure may
    // still see the previous mode and accidentally block switching away from Major.
    if (playSound) soundFx.playClick();
    setGroupAssignments({});
    setTeamCount(count);
    let nextTeamIds = selectedTeamIds;
    if (selectedTeamIds.length > count) {
      nextTeamIds = selectedTeamIds.slice(0, count);
    } else if (selectedTeamIds.length < count) {
      const remaining = defaultSortedTeams
        .filter((t) => !selectedTeamIds.includes(t.id))
        .map((t) => t.id);
      nextTeamIds = [...selectedTeamIds, ...remaining.slice(0, count - selectedTeamIds.length)];
    }
    setSelectedTeamIds(nextTeamIds);
    setMajorStageAssignments(mode === 'major' ? getDefaultMajorStageAssignments(nextTeamIds) : {});
  };

  // Toggle Team Selection
  const handleToggleTeam = (teamId: string) => {
    soundFx.playClick();
    setGroupAssignments({});
    let nextTeamIds = selectedTeamIds;
    if (selectedTeamIds.includes(teamId)) {
      nextTeamIds = selectedTeamIds.filter((id) => id !== teamId);
      const nextAssignments = { ...majorStageAssignments };
      delete nextAssignments[teamId];
      setMajorStageAssignments(nextAssignments);
    } else if (selectedTeamIds.length < teamCount) {
      nextTeamIds = [...selectedTeamIds, teamId];
    }
    setSelectedTeamIds(nextTeamIds);
    setMajorStageAssignments((previous) => getEffectiveMajorStageAssignments(nextTeamIds, previous));
  };

  // Auto-seed by VRS rating & current form
  const handleAutoSeed = () => {
    soundFx.playClick();
    const currentTeams = selectedTeamIds.map((id) => teams.find((t) => t.id === id)!).filter(Boolean);
    const sorted = [...currentTeams].sort((a, b) => {
      const formA = a.mapProfile?.currentForm || 80;
      const formB = b.mapProfile?.currentForm || 80;
      const scoreA = a.points * 0.7 + formA * 10;
      const scoreB = b.points * 0.7 + formB * 10;
      return scoreB - scoreA;
    });
    setGroupAssignments(getEffectiveGroupAssignments(selectedTeamIds, groupAssignments, groupCount));
    setSelectedTeamIds(sorted.map((t) => t.id));
  };

  // Shuffle seed randomly
  const handleRandomSeed = () => {
    soundFx.playClick();
    const shuffled = [...selectedTeamIds].sort(() => Math.random() - 0.5);
    setGroupAssignments(getEffectiveGroupAssignments(selectedTeamIds, groupAssignments, groupCount));
    setSelectedTeamIds(shuffled);
  };

  // Move team seed up/down
  const handleMoveSeed = (index: number, direction: 'up' | 'down') => {
    soundFx.playClick();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedTeamIds.length) return;
    const copy = [...selectedTeamIds];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setGroupAssignments(getEffectiveGroupAssignments(selectedTeamIds, groupAssignments, groupCount));
    setSelectedTeamIds(copy);
  };

  // Finish and Create Tournament
  const handleCreate = () => {
    if (selectedTeamIds.length < 2 || !isGroupLayoutValid || !isMajorAllocationValid || !isBlastTeamCountValid) return;
    soundFx.playVictory();

    const selectedTeamsInSeedOrder = selectedTeamIds
      .map((id) => teams.find((t) => t.id === id)!)
      .filter(Boolean);

    const newTournament = createCustomTournament({
      name,
      shortName,
      organizer,
      prizePool,
      startDate,
      description,
      tier,
      mode,
      teams: selectedTeamsInSeedOrder,
      stageFormats: {
        ...stageFormats,
        groupCount,
        groupStyle,
        groupAssignments,
        gslLowerSemiLoserRouting: stageFormats.gslLowerSemiLoserRouting || 'swapped'
      },
      includeThirdPlace: mode === 'major' ? false : includeThirdPlace,
      majorStageAssignments: mode === 'major' ? effectiveMajorStageAssignments : undefined
    });

    const tournamentWithOpeningPairs = applyOpeningPairOrders(newTournament, openingPairOrders);
    onCreateTournament(tournamentWithOpeningPairs);
    onClose();
  };

  // Filtered teams list for picker
  const [teamSort, setTeamSort] = useState<'rating' | 'random' | 'name'>('rating');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const filteredAvailableTeams = useMemo(() => {
    const list = teams.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTeam.toLowerCase()) ||
        (t.rosterSnippet || []).some((p) => p.toLowerCase().includes(searchTeam.toLowerCase()));
      const matchRegion = selectedRegion === 'all' || t.region === selectedRegion;
      return matchSearch && matchRegion;
    });
    if (teamSort === 'rating') return [...list].sort((a, b) => b.points - a.points);
    if (teamSort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, searchTeam, selectedRegion, teamSort, shuffleSeed]);

  const openingPairsDraftTournament = useMemo(() => {
    const draftTeams = selectedTeamIds.map((id) => teams.find((team) => team.id === id)).filter(Boolean) as Team[];
    return createCustomTournament({
      name,
      shortName,
      organizer,
      prizePool,
      startDate,
      description,
      tier,
      mode,
      teams: draftTeams,
      stageFormats: {
        ...stageFormats,
        groupCount,
        groupStyle,
        groupAssignments,
        gslLowerSemiLoserRouting: stageFormats.gslLowerSemiLoserRouting || 'swapped'
      },
      includeThirdPlace: mode === 'major' ? false : includeThirdPlace,
      majorStageAssignments: mode === 'major' ? effectiveMajorStageAssignments : undefined
    });
  }, [selectedTeamIds, teams, name, shortName, organizer, prizePool, startDate, description, tier, mode, stageFormats, groupCount, groupStyle, groupAssignments, includeThirdPlace, effectiveMajorStageAssignments]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#0e1422] border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Создание турнира CS2</span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Tournament Manager
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Настройте формат, участников, посев (seed) и правила стадий
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 text-xs font-mono overflow-x-auto shrink-0">
          {[
            { num: 1, label: '1. Пресеты & Инфо' },
            { num: 2, label: '2. Формат турнира' },
            { num: 3, label: '3. Команды & Посев' },
            { num: 4, label: '4. Стартовые пары' },
            { num: 5, label: '5. Формат матчей' }
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => {
                soundFx.playClick();
                setStep(s.num as any);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                step === s.num
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/60'
              }`}
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* STEP 1: PRESETS & BASIC INFO */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Ready Presets Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Готовые шаблоны турниров
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Нажмите шаблон для мгновенного заполнения
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {TOURNAMENT_PRESETS.map((p) => {
                    const isSelected = name === p.name;
                    const isMajorPreset = p.id === 'major';
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleApplyPreset(p)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? isMajorPreset
                              ? 'bg-gradient-to-br from-purple-900/60 to-slate-950 border-purple-400 shadow-md ring-2 ring-purple-500/40'
                              : 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                            : isMajorPreset
                              ? 'bg-gradient-to-br from-purple-950/50 to-slate-950 border-purple-500/50 hover:border-purple-300 hover:from-purple-900/40'
                              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-white truncate">{isMajorPreset ? 'CS2 MAJOR · 3 ШВЕЙЦАРСКИЕ СТАДИИ' : p.name}</span>
                          <span className={`font-mono text-[10px] shrink-0 ml-1 ${isMajorPreset ? 'text-purple-200' : 'text-amber-400'}`}>
                            {p.teamCount} команд
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {p.description}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>{p.organizer}</span>
                          <span className="text-emerald-400 font-bold">{p.prizePool}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tournament Tier / Status Selector */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Статус турнира (Tier) & Начисление VRS
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Определяет уровень престижа кубка и динамический бонус очков VRS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {TOURNAMENT_TIERS.map((t) => {
                    const isSelected = tier === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          soundFx.playClick();
                          setTier(t.id);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? `bg-gradient-to-br ${t.bgGradient} ${t.borderColor} ring-1 ring-amber-500/40 shadow-lg`
                            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                              t.id === 'Major'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : t.id === 'S-Tier'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : t.id === 'A-Tier'
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                : t.id === 'B-Tier'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {t.badge}
                          </span>

                          <span className="text-[11px] font-mono font-bold text-emerald-400">
                            {t.vrsEstimate}
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>{t.label}</span>
                            {isSelected && <span className="text-[10px] text-amber-400 font-mono font-bold">Выбран</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                            {t.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tournament Details Form */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  Параметры турнира
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Название турнира:</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#090d14] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Короткий тег / Аббревиатура:</label>
                    <input
                      type="text"
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      className="w-full bg-[#090d14] border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Организатор турнира:</label>
                    <input
                      type="text"
                      value={organizer}
                      onChange={(e) => setOrganizer(e.target.value)}
                      className="w-full bg-[#090d14] border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Призовой фонд:</label>
                    <input
                      type="text"
                      value={prizePool}
                      onChange={(e) => setPrizePool(e.target.value)}
                      className="w-full bg-[#090d14] border border-slate-700/80 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Дата старта:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#090d14] border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Описание турнира:</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#090d14] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TOURNAMENT FORMATS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Выберите формат соревнований
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Поддерживаются все основные киберспортивные форматы CS2
                </span>
              </div>

              <button
                type="button"
                onClick={handleSelectMajorMode}
                aria-pressed={mode === 'major'}
                className={`mb-4 w-full rounded-2xl border p-4 sm:p-5 text-left transition-all cursor-pointer ${
                  mode === 'major'
                    ? 'border-purple-400 bg-gradient-to-r from-purple-900/70 via-purple-950/50 to-slate-950 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                    : 'border-purple-500/50 bg-gradient-to-r from-purple-950/55 via-slate-900/80 to-slate-950 hover:border-purple-300 hover:from-purple-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-purple-300/30 bg-purple-400/15 p-2.5 text-purple-200 shrink-0">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base font-extrabold tracking-wide text-white">CS2 MAJOR · 3 ШВЕЙЦАРСКИЕ СТАДИИ → ПЛЕЙ-ОФФ</span>
                        <span className="rounded-full border border-purple-300/40 bg-purple-400/15 px-2 py-0.5 text-[10px] font-mono font-extrabold text-purple-200">32 КОМАНДЫ</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        Отдельный формат Major: Stage 1 — 16 команд; Stage 2 — 8 приглашённых + 8 прошедших; Stage 3 — 8 приглашённых + 8 прошедших; затем плей-офф Top 8.
                      </p>
                      <p className="mt-2 text-[11px] font-bold text-purple-200">
                        BO1 для обычных матчей Stage 1–2 · BO3 для матчей за выход/вылет · BO3 Stage 3 · BO5 гранд-финал. Настройки можно изменить на шаге 4.
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold ${mode === 'major' ? 'bg-purple-300 text-purple-950' : 'bg-purple-400/15 text-purple-100 border border-purple-300/30'}`}>
                    {mode === 'major' ? '✓ ВЫБРАН MAJOR' : 'ВЫБРАТЬ MAJOR →'}
                  </span>
                </div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    key: 'swiss_playoffs' as TournamentMode,
                    title: 'Swiss → Playoffs (Рекомендуемый)',
                    badge: '16 команд',
                    desc: 'Швейцарская система (3 победы для выхода, 3 поражения для вылета), затем плей-офф топ-8 на арене.'
                  },
                  {
                    key: 'blast_bounty' as TournamentMode,
                    title: 'BLAST Bounty · Draft & Rewards',
                    badge: '32 команды',
                    desc: 'Отдельный формат BLAST Bounty: 32 команды, интерактивный драфт соперников, динамические награды за голову, наследование посева и ставки на LAN Final 8. Online BO3, LAN BO3, гранд-финал BO5.'
                  },
                  {
                    key: 'single_elimination' as TournamentMode,
                    title: 'Single Elimination (Олимпийская)',
                    badge: '4–32 команды',
                    desc: 'Сетка на выбывание без права на ошибку. Проигравший вылетает, победитель проходит в следующий раунд.'
                  },
                  {
                    key: 'double_elimination' as TournamentMode,
                    title: 'Double Elimination',
                    badge: '8 или 16 команд',
                    desc: 'Верхняя и нижняя сетки. Первый проигрыш отправляет в сетку лузеров, второй проигрыш означает вылет. Гранд-финал BO5.'
                  },
                  {
                    key: 'swiss_system' as TournamentMode,
                    title: 'Swiss System (Чистая швейцарка)',
                    badge: '16 команд',
                    desc: '5 раундов швейцарской системы без финальной сетки. Команды распределяются по итоговому счету (3:0, 3:1, 3:2 и т.д.).'
                  },
                  {
                    key: 'gsl_groups' as TournamentMode,
                    title: 'GSL-группы → плей-офф',
                    badge: '8 или 16 участников',
                    desc: 'Формат зависит от размера группы: 4 команды — Winners, Elimination и Decider за 2 места; 8 команд — верхняя/нижняя сетки и 3 места в плей-офф.'
                  },
                  {
                    key: 'groups_playoffs' as TournamentMode,
                    title: 'Круговые группы → плей-офф',
                    badge: 'Группы + плей-офф',
                    desc: 'Команды разделены на группы по 4 участника. Каждая играет с каждой. Топ-2 выходят в плей-офф.'
                  },
                  {
                    key: 'round_robin' as TournamentMode,
                    title: 'Круговой формат · таблица результатов',
                    badge: 'Таблица очков',
                    desc: 'Каждая команда играет с каждой. Общая таблица очков, побед/поражений и разницы карт.'
                  }
                ].map((fmt) => {
                  const isCur = mode === fmt.key;
                  return (
                    <div
                      key={fmt.key}
                      onClick={() => {
                        soundFx.playClick();
                        setMode(fmt.key);
                        if (fmt.key === 'blast_bounty') {
                          setName('BLAST Bounty CS2 Championship 2026');
                          setShortName('BLAST BOUNTY');
                          setOrganizer('BLAST');
                          setPrizePool('$600,000 Bounty pool');
                          setTier('S-Tier');
                          setDescription('32 команды. Онлайн: 2 раунда BO3 до Final 8. LAN: четвертьфиналы и полуфиналы BO3, гранд-финал BO5. Динамические награды за голову 50/50, интерактивный драфт соперников, наследование посева и wagers на LAN.');
                          setIncludeThirdPlace(false);
                          setGroupAssignments({});
                          setMajorStageAssignments({});
                          handleSetTeamCount(32, false);
                          setStageFormats((previous) => ({ ...previous, quarterfinalFormat: 'BO3', semifinalFormat: 'BO3', finalFormat: 'BO5' }));
                        } else if (fmt.key === 'gsl_groups') {
                          setGroupCount(2);
                          setGroupAssignments({});
                          const useEightTeamGroups = teamCount >= 16;
                          setGroupStyle(useEightTeamGroups ? 'gsl_double_elim_8' : 'gsl_classic_4');
                          handleSetTeamCount(useEightTeamGroups ? 16 : 8, false);
                        } else if (fmt.key === 'groups_playoffs') {
                          setGroupStyle('round_robin');
                          setGroupAssignments({});
                          const useFourGroups = teamCount >= 16;
                          setGroupCount(useFourGroups ? 4 : 2);
                          if (teamCount !== (useFourGroups ? 16 : 8)) {
                            handleSetTeamCount(useFourGroups ? 16 : 8, false);
                          }
                        } else if (fmt.key === 'double_elimination') {
                          setIncludeThirdPlace(false);
                          setGroupAssignments({});
                          handleSetTeamCount(teamCount >= 16 ? 16 : 8, false);
                        }
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isCur
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-white text-sm">{fmt.title}</span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                          {fmt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {fmt.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* GROUPS CUSTOMIZATION PANEL */}
              {(mode === 'groups_playoffs' || mode === 'gsl_groups') && (
                <div className="p-4 rounded-2xl bg-[#090d14] border border-amber-500/40 space-y-4 animate-in fade-in duration-200 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Формат групп и выход в плей-офф
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {`${groupCount} группы · ${groupSizeLabel} · ${usesGslGroups && (teamsPerGroup === 8 || groupStyle === 'gsl_top3') ? 3 : 2} в плей-офф из каждой`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Number of groups */}
                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1.5 font-bold">
                        Схема групп (число участников указано ниже):
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                        {[
                          { cnt: 2, label: '2 группы A/B', desc: groupStyle === 'gsl_double_elim_8' ? '16 команд · по 8' : groupStyle === 'gsl_top3' ? '8 команд · по 4' : groupStyle === 'gsl_classic_4' ? '8 команд · по 4' : '8 или 16 команд · по 4/8' },
                          { cnt: 4, label: '4 группы A–D', desc: '16 команд · по 4' }
                        ].map((gOpt) => {
                          const fixedTwoGroups = groupStyle === 'gsl_double_elim_8';
                          const optionDisabled = fixedTwoGroups && gOpt.cnt !== 2;
                          return (
                            <button
                              key={gOpt.cnt}
                              type="button"
                              disabled={optionDisabled}
                              onClick={() => {
                                if (optionDisabled) return;
                                soundFx.playClick();
                                setGroupCount(gOpt.cnt);
                                setGroupAssignments({});
                                const nextTeamCount = groupStyle === 'gsl_double_elim_8' ? 16
                                  : groupStyle === 'gsl_classic_4' || groupStyle === 'gsl_top3' ? gOpt.cnt * 4
                                  : gOpt.cnt === 2 ? 16 : gOpt.cnt * 4;
                                handleSetTeamCount(nextTeamCount, false);
                              }}
                              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                                optionDisabled ? 'opacity-35 cursor-not-allowed bg-slate-950 border-slate-800' : 'cursor-pointer ' + (groupCount === gOpt.cnt
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white')
                              }`}
                            >
                              <div className="text-white font-bold">{gOpt.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">{gOpt.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group stage bracket style */}
                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1.5 font-bold">
                        Тип группового этапа:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playClick();
                            setGroupStyle('gsl_classic_4');
                            setMode('gsl_groups');
                            const classicGroupCount = groupCount === 4 ? 4 : 2;
                            setGroupCount(classicGroupCount);
                            setGroupAssignments({});
                            handleSetTeamCount(classicGroupCount * 4, false);
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                            groupStyle === 'gsl_classic_4'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-white font-bold">GSL Classic · 4 команды / 2 места</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">2 группы (8 команд) или 4 группы A–D (16 команд); из каждой проходят 2. Winners, Elimination и Decider.</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playClick();
                            setGroupStyle('gsl_double_elim_8');
                            setMode('gsl_groups');
                            setGroupCount(2);
                            setGroupAssignments({});
                            handleSetTeamCount(16, false);
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                            groupStyle === 'gsl_double_elim_8'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-white font-bold">GSL Double Elimination · 8 команд / 3 места</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">2 группы A/B · всего 16 команд · 3 места из каждой. Верхняя и нижняя сетки, перекрёстное падение в нижних полуфиналах.</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playClick();
                            setGroupStyle('gsl_top3');
                            setMode('gsl_groups');
                            setGroupCount(2);
                            setGroupAssignments({});
                            handleSetTeamCount(8, false);
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                            groupStyle === 'gsl_top3'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-white font-bold">GSL Top 3 · 4 команды / 3 места</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">2 или 4 группы по 4 команды. Всего 8 или 16 участников. Из каждой группы выходят 3 команды: 1-е место получает преимущество, 2-е и 3-е идут в плей-офф.</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playClick();
                            setGroupStyle('round_robin');
                            setMode('groups_playoffs');
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                            groupStyle === 'round_robin'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-white font-bold">Круговой этап · таблица результатов</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">Все команды группы встречаются друг с другом; места определяются по таблице результатов.</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {usesGslGroups && (groupStyle === 'gsl_double_elim_8' || (groupStyle === 'gsl' && teamsPerGroup === 8)) && teamsPerGroup === 8 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
                      <div className="text-xs font-bold text-white">Маршрут проигравших в нижнюю сетку</div>
                      <p className="text-[11px] leading-relaxed text-slate-400">Настройка определяет, в какой Lower semi-final попадут проигравшие в Upper semi-final 1 и 2.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="button" onClick={() => setStageFormats({ ...stageFormats, gslLowerSemiLoserRouting: 'swapped' })} className={`rounded-xl border p-3 text-left transition-colors ${stageFormats.gslLowerSemiLoserRouting !== 'same' ? 'border-amber-500 bg-amber-500/10 text-amber-200' : 'border-slate-700 bg-slate-950 text-slate-400'}`}>
                          <span className="block text-xs font-bold">Перекрёстно (рекомендуется)</span>
                          <span className="mt-1 block text-[10px]">Проигравший Upper SF 1 → Lower SF 2; Upper SF 2 → Lower SF 1</span>
                        </button>
                        <button type="button" onClick={() => setStageFormats({ ...stageFormats, gslLowerSemiLoserRouting: 'same' })} className={`rounded-xl border p-3 text-left transition-colors ${stageFormats.gslLowerSemiLoserRouting === 'same' ? 'border-amber-500 bg-amber-500/10 text-amber-200' : 'border-slate-700 bg-slate-950 text-slate-400'}`}>
                          <span className="block text-xs font-bold">По тому же номеру</span>
                          <span className="mt-1 block text-[10px]">Проигравший Upper SF 1 → Lower SF 1; Upper SF 2 → Lower SF 2</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-bold">Схема выхода в плей-офф: </span>
                      <span>
                        {groupStyle === 'gsl_top3'
                          ? (groupCount === 2
                            ? 'Две группы по 4 команды: 1-е место из каждой группы напрямую выходит в полуфинал, 2-е и 3-е места играют четвертьфиналы крест-накрест.'
                            : 'Четыре группы по 4 команды: победители групп получают преимущество в плей-офф, остальные квалифицируются по местам группы.')
                          : groupStyle === 'gsl_double_elim_8' || (groupStyle === 'gsl' && groupCount === 2 && teamCount >= 16)
                            ? 'Две группы по 8 команд: из каждой выходят 3 команды. Победитель группы занимает 1-е место, проигравший Upper Final — 2-е, победитель Lower Final — 3-е. В плей-офф четвертьфиналы перекрёстные.'
                            : groupStyle === 'gsl_classic_4'
                              ? (groupCount === 4 ? 'Четыре группы по 4 команды: из каждой выходят 2 команды. Всего 8 участников плей-офф; пары четвертьфиналов формируются перекрёстно.' : 'Две группы по 4 команды: из каждой выходят 2 команды. Победитель Winners идёт на 1-е место, победитель Decider — на 2-е. Плей-офф сразу с полуфиналов.')
                              : groupCount === 2 && teamCount >= 16
                                ? 'Две группы по 8 команд: из каждой выходят 3 команды. Победители групп начинают с полуфинала, 2-е и 3-и места играют четвертьфиналы крест-накрест.'
                                : groupCount === 2
                                  ? 'Две группы по 4 команды: по 2 лучшие команды выходят в полуфиналы.'
                                  : `Из ${groupCount} групп выходят по 2 лучшие команды (всего ${groupCount * 2} в плей-офф).`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(mode === 'swiss_playoffs' || mode === 'major' || mode === 'groups_playoffs' || mode === 'gsl_groups') && (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">Тип плей-офф после групп / швейцарки</h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Этот выбор применяется после определения всех участников плей-офф. Остальные форматы турниров остаются без изменений.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { value: 'single_elimination' as const, title: 'Single Elimination', desc: 'Одна сетка: одно поражение — вылет.' },
                      { value: 'double_elimination' as const, title: 'Double Elimination', desc: 'Верхняя и нижняя сетки; команда вылетает после второго поражения.' }
                    ]).map((option) => (
                      <button key={option.value} type="button" onClick={() => {
                        soundFx.playClick();
                        setStageFormats((previous) => ({ ...previous, playoffType: option.value }));
                        if (option.value === 'double_elimination') setIncludeThirdPlace(false);
                      }} className={`rounded-xl border p-3 text-left transition-colors ${stageFormats.playoffType === option.value ? 'border-amber-500 bg-amber-500/10 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
                        <span className="block text-sm font-bold">{option.title}</span>
                        <span className="mt-1 block text-[11px]">{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: TEAMS SELECTION & SEEDING */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Team count and seed controls */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-400" />
                      Количество участников турнира
                    </h4>
                    <span className="text-xs font-mono text-slate-400 mt-0.5 block">
                      Выбрано: <span className="text-amber-400 font-bold">{selectedTeamIds.length}</span> из {teamCount} команд
                    </span>
                    {(!isGroupLayoutValid || !isMajorAllocationValid || !isBlastTeamCountValid) && (
                      <span className="text-[10px] font-mono text-rose-300 mt-1 block">
                        {mode === 'major'
                          ? 'Для Major нужно ровно 32 участника: 16 в Stage 1, 8 напрямую в Stage 2 и 8 напрямую в Stage 3.'
                          : mode === 'blast_bounty'
                            ? 'Для BLAST Bounty нужны ровно 32 участника.'
                          : usesGslGroups
                            ? (groupStyle === 'gsl_top3' ? 'Для GSL Top 3 нужны группы строго по 4 команды (8 участников для 2 групп или 16 для 4 групп).' : groupStyle === 'gsl_classic_4' ? 'Для GSL Classic нужны группы по 4 команды: 8 участников при 2 группах или 16 при 4 группах.' : groupStyle === 'gsl_double_elim_8' ? 'GSL Double Elimination рассчитан строго на 16 участников: 2 группы по 8 команд.' : 'Для GSL выбери равные группы по 4 или 8 команд (всего 8 или 16 участников).')
                            : `Количество участников должно делиться на ${groupCount} группы, минимум по 2 команды.`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#090d14] p-1 rounded-xl border border-slate-800">
                    {groupTeamCountOptions.map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => handleSetTeamCount(cnt)}
                        className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                          teamCount === cnt
                            ? 'bg-amber-500 text-black shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seed Action Buttons */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAutoSeed}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/30 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                    title="Расставить команды в посеве по рейтингу и текущей форме"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Автоматический посев (По рейтингу)</span>
                  </button>

                  <button
                    onClick={handleRandomSeed}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                    title="Случайно перемешать номера посева"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Случайная жеребьевка (Перемешать)</span>
                  </button>

                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedTeamIds(defaultSortedTeams.slice(0, teamCount).map((t) => t.id));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    <span>Выбрать Топ-{teamCount}</span>
                  </button>
                </div>
              </div>

              {/* Seeded Teams Order List */}
              <div className="p-4 rounded-2xl bg-[#090d14] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">
                    Текущий посев (Seed 1 → {selectedTeamIds.length})
                  </span>
                  <span className="text-slate-500">
                    Используйте стрелки для ручной корректировки посева
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {selectedTeamIds.map((id, idx) => {
                    const team = teams.find((t) => t.id === id);
                    if (!team) return null;
                    return (
                      <div
                        key={id}
                        className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                            #{idx + 1}
                          </span>
                          <TeamLogo team={team} size="xs" />
                          <span className="text-white font-bold truncate">
                            {team.shortName && team.shortName !== team.name
                              ? `${team.name} (${team.shortName})`
                              : team.name}
                          </span>
                        </div>

                        {(mode === 'groups_playoffs' || mode === 'gsl_groups') && (
                          <select
                            aria-label={`Группа для команды ${team.name}`}
                            value={(groupAssignments[id] && 'ABCDEFGH'.slice(0, groupCount).includes(groupAssignments[id])) ? groupAssignments[id] : (() => {
                              const groupLetters = 'ABCDEFGH'.split('');
                              const round = Math.floor(idx / groupCount);
                              const pos = round % 2 === 0 ? idx % groupCount : groupCount - 1 - (idx % groupCount);
                              return groupLetters[pos] || 'A';
                            })()}
                            onChange={(e) => {
                              const targetGroup = e.target.value;
                              setGroupAssignments((prev) => {
                                const effective = getEffectiveGroupAssignments(selectedTeamIds, prev, groupCount);
                                const sourceGroup = effective[id];
                                if (!sourceGroup || sourceGroup === targetGroup) return prev;
                                // Swap with one team already in the target group so every group stays even.
                                const swapTeamId = selectedTeamIds.find((candidateId) => candidateId !== id && effective[candidateId] === targetGroup);
                                if (!swapTeamId) return prev;
                                return { ...effective, [id]: targetGroup, [swapTeamId]: sourceGroup };
                              });
                            }}
                            className="max-w-[76px] rounded-lg border border-amber-500/30 bg-slate-950 px-1.5 py-1 text-[10px] text-amber-300"
                            title="Назначить команду в группу"
                          >
                            {'ABCDEFGH'.slice(0, groupCount).split('').map((letter) => (
                              <option key={letter} value={letter}>Группа {letter}</option>
                            ))}
                          </select>
                        )}
                        {mode === 'major' && (
                          <select
                            aria-label={`Этап Major для команды ${team.name}`}
                            value={effectiveMajorStageAssignments[id]}
                            onChange={(e) => {
                              const targetStage = Number(e.target.value) as 1 | 2 | 3;
                              const current = effectiveMajorStageAssignments;
                              const sourceStage = current[id];
                              if (sourceStage === targetStage) return;
                              const caps = { 1: 16, 2: 8, 3: 8 } as const;
                              const targetMembers = selectedTeamIds.filter((teamId) => current[teamId] === targetStage && teamId !== id);
                              const targetIsFull = targetMembers.length >= caps[targetStage];
                              const swappedId = targetIsFull ? targetMembers[targetMembers.length - 1] : undefined;
                              setMajorStageAssignments({
                                ...current,
                                [id]: targetStage,
                                ...(swappedId ? { [swappedId]: sourceStage } : {})
                              });
                            }}
                            className="max-w-[118px] rounded-lg border border-purple-500/30 bg-slate-950 px-1.5 py-1 text-[10px] text-purple-200"
                            title="Распределение команд по стартовым слотам Major"
                          >
                            <option value={1}>Stage 1</option>
                            <option value={2}>Stage 2 (direct)</option>
                            <option value={3}>Stage 3 (direct)</option>
                          </select>
                        )}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveSeed(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Поднять посев"
                          >
                            ▲
                          </button>
                          <button
                            disabled={idx === selectedTeamIds.length - 1}
                            onClick={() => handleMoveSeed(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Опустить посев"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => handleToggleTeam(id)}
                            className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                            title="Убрать команду из турнира"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {mode === 'major' && (
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-200">Распределение 32 участников по стадиям</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                    {[
                      { stage: 1 as const, count: 16, title: 'Stage 1', subtitle: 'Первая швейцарка' },
                      { stage: 2 as const, count: 8, title: 'Stage 2', subtitle: '8 прямых + 8 из Stage 1' },
                      { stage: 3 as const, count: 8, title: 'Stage 3', subtitle: '8 прямых + 8 из Stage 2' }
                    ].map((item) => (
                      <div key={item.stage} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                        <div className="flex items-center justify-between"><span className="font-bold text-white">{item.title}</span><span className={`font-bold ${majorStageCounts[item.stage] === item.count ? 'text-emerald-300' : 'text-rose-300'}`}>{majorStageCounts[item.stage]}/{item.count}</span></div>
                        <div className="mt-1 text-[10px] text-slate-400">{item.subtitle}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Teams Database with Search & Filters */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    База команд CS2 (Кликните для добавления/удаления)
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Поиск команды..."
                        value={searchTeam}
                        onChange={(e) => setSearchTeam(e.target.value)}
                        className="bg-[#090d14] border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="bg-[#090d14] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">Все регионы</option>
                      <option value="Европа">Европа</option>
                      <option value="Южная Америка">Южная Америка</option>
                      <option value="Северная Америка">Северная Америка</option>
                      <option value="Азия">Азия</option>
                    </select>

                    <select
                      value={teamSort}
                      onChange={(e) => {
                        setTeamSort(e.target.value as 'rating' | 'random' | 'name');
                        setShuffleSeed((s) => s + 1);
                      }}
                      className="bg-[#090d14] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="rating">По текущему рейтингу</option>
                      <option value="random">Случайно</option>
                      <option value="name">А-Я</option>
                    </select>
                    {teamSort === 'random' && (
                      <button
                        type="button"
                        onClick={() => setShuffleSeed((s) => s + 1)}
                        className="bg-[#090d14] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 cursor-pointer"
                      >
                        Перемешать
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {filteredAvailableTeams.map((t) => {
                    const isSelected = selectedTeamIds.includes(t.id);
                    const seedIdx = selectedTeamIds.indexOf(t.id);

                    return (
                      <button
                        key={t.id}
                        onClick={() => handleToggleTeam(t.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[90px] relative ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 shadow-sm'
                            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-mono font-bold flex items-center justify-center">
                            #{seedIdx + 1}
                          </span>
                        )}

                        <TeamLogo team={t} size="sm" />
                        <div className="mt-1 font-bold text-white text-xs truncate max-w-full">
                          {t.name}
                        </div>
                        {t.shortName && (
                          <div className="text-[10px] font-mono font-bold text-amber-400">
                            [{t.shortName}]
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400">
                          {t.points} VRS
                        </div>
                        {t.trophiesCount !== undefined && t.trophiesCount > 0 && (
                          <div className="text-[9px] font-mono text-amber-400 flex items-center gap-0.5">
                            <Trophy className="w-2.5 h-2.5" />
                            <span>{t.trophiesCount}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: MANUAL OPENING PAIRINGS */}
          {step === 4 && openingPairsDraftTournament && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Настройка стартовых пар</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Переставляйте команды между слотами, чтобы вручную выбрать соперников в первом раунде. В групповых форматах здесь настраиваются стартовые матчи каждой группы; в Single / Double Elimination — пары стартовой сетки. Дальнейшие раунды заполняются автоматически.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <OpeningPairsEditor tournament={openingPairsDraftTournament} teams={teams} orders={openingPairOrders} onChange={setOpeningPairOrders} />
              </div>
            </div>
          )}

          {/* STEP 5: STAGE MATCH FORMATS (BO1 / BO3 / BO5) */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Настройка форматов матчей для стадий
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  MR12 CS2 (до 13 раундов, OT MR3)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                {mode === 'blast_bounty' && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="text-sm font-black uppercase tracking-wide text-amber-200">BLAST Bounty · фиксированный регламент</div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">Все матчи онлайн-стадии и LAN Final 8 проходят в формате BO3. Только гранд-финал играется BO5. Матча за 3-е место нет. Соперники выбираются через Draft Show, а награды и ставки рассчитываются динамически во время симуляции.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  {mode === 'major' && ([1, 2, 3] as const).map((stageNumber) => {
                    const normalKey = `majorStage${stageNumber}NormalFormat` as keyof StageFormatSettings;
                    const deciderKey = `majorStage${stageNumber}DeciderFormat` as keyof StageFormatSettings;
                    const stageName = stageNumber === 1 ? 'Stage 1 · Первая швейцарка' : stageNumber === 2 ? 'Stage 2 · Вторая швейцарка' : 'Stage 3 · Финальная швейцарка';
                    return (
                      <div key={stageNumber} className="col-span-1 sm:col-span-2 rounded-xl border border-purple-500/25 bg-purple-500/5 p-3 space-y-3">
                        <div className="text-xs font-bold text-purple-200">{stageName}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <span className="block text-slate-300">Обычные матчи (открывающие и промежуточные)</span>
                            <div className="flex items-center gap-2">
                              {(['BO1', 'BO3'] as MatchFormat[]).map((f) => (
                                <button key={f} onClick={() => setStageFormats({ ...stageFormats, [normalKey]: f })} className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${stageFormats[normalKey] === f ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{f}</button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="block text-slate-300">Матчи за выход / вылет (счёт 2:0, 2:1, 1:2, 0:2, 2:2)</span>
                            <div className="flex items-center gap-2">
                              {(['BO1', 'BO3'] as MatchFormat[]).map((f) => (
                                <button key={f} onClick={() => setStageFormats({ ...stageFormats, [deciderKey]: f })} className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${stageFormats[deciderKey] === f ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{f}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Swiss / Group stage normal */}
                  {mode !== 'major' && mode !== 'blast_bounty' && <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <span className="text-slate-300 font-bold block">
                      Групповой / Швейцарский этап (Обычные матчи):
                    </span>
                    <div className="flex items-center gap-2">
                      {(['BO1', 'BO3'] as MatchFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            soundFx.playClick();
                            setStageFormats({ ...stageFormats, swissNormalFormat: f, groupFormat: f });
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                            stageFormats.swissNormalFormat === f
                              ? 'bg-amber-500 text-black'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  }

                  {/* Swiss deciders */}
                  {mode !== 'major' && mode !== 'blast_bounty' && <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <span className="text-slate-300 font-bold block">
                      Матчи за выход / вылет (2:0, 0:2, 2:2):
                    </span>
                    <div className="flex items-center gap-2">
                      {(['BO1', 'BO3'] as MatchFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            soundFx.playClick();
                            setStageFormats({ ...stageFormats, swissDeciderFormat: f });
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                            stageFormats.swissDeciderFormat === f
                              ? 'bg-amber-500 text-black'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  }

                  {/* Quarterfinals */}
                  {mode !== 'blast_bounty' && <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <span className="text-slate-300 font-bold block">
                      Четвертьфиналы плей-офф:
                    </span>
                    <div className="flex items-center gap-2">
                      {(['BO1', 'BO3'] as MatchFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            soundFx.playClick();
                            setStageFormats({ ...stageFormats, quarterfinalFormat: f });
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                            stageFormats.quarterfinalFormat === f
                              ? 'bg-amber-500 text-black'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>}

                  {/* Grand Final */}
                  {mode !== 'blast_bounty' && <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <span className="text-slate-300 font-bold block">
                      Гранд-финал чемпионата:
                    </span>
                    <div className="flex items-center gap-2">
                      {(['BO3', 'BO5'] as MatchFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            soundFx.playClick();
                            setStageFormats({ ...stageFormats, finalFormat: f });
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                            stageFormats.finalFormat === f
                              ? 'bg-amber-500 text-black'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>}
                </div>

                {/* Third Place Toggle */}
                {mode !== 'blast_bounty' && <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-white block">Матч за 3-е место (Бронзовый финал)</span>
                    <span className="text-slate-400 text-[11px]">
                      {mode === 'major'
                        ? 'В стандартном Major плей-офф Top 8 проходит без матча за 3-е место.'
                        : stageFormats.playoffType === 'double_elimination'
                          ? 'Для Double Elimination отдельный матч за 3-е место не используется.'
                          : thirdPlaceRequired
                          ? 'Обязателен для формата с 8 командами в каждой группе: победитель получает 3-е место.'
                          : 'Проводить матч между проигравшими в полуфинале'}
                    </span>
                  </div>

                  <button
                    disabled={thirdPlaceRequired || mode === 'major' || mode === 'blast_bounty' || stageFormats.playoffType === 'double_elimination'}
                    onClick={() => {
                      if (thirdPlaceRequired || mode === 'major' || mode === 'blast_bounty' || stageFormats.playoffType === 'double_elimination') return;
                      soundFx.playClick();
                      setIncludeThirdPlace((p) => !p);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                      (thirdPlaceRequired || mode === 'major' || mode === 'blast_bounty' || stageFormats.playoffType === 'double_elimination') ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                    } ${
                      (includeThirdPlace || thirdPlaceRequired)
                        ? 'bg-emerald-500 text-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {(includeThirdPlace || thirdPlaceRequired) ? 'Включен' : 'Отключен'}
                  </button>
                </div>}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Controls Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {step > 1 && (
              <button
                onClick={() => {
                  soundFx.playClick();
                  setStep((s) => (s - 1) as any);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                onClick={() => {
                  soundFx.playClick();
                  setStep((s) => (s + 1) as any);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <span>Далее</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={selectedTeamIds.length < 2 || !isGroupLayoutValid || !isMajorAllocationValid || !isBlastTeamCountValid}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Создать и запустить турнир</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
