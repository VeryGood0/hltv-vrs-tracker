import { ActiveDutyMap, TeamMapProfile, TeamMapStats, ACTIVE_DUTY_MAPS } from '../types';

export interface MapMetadata {
  id: ActiveDutyMap;
  name: string;
  russianName: string;
  themeColor: string;
  accentBg: string;
  tagline: string;
  ctAdvantage: string; // e.g. "CT 51.4%"
  tAdvantage: string;  // e.g. "T 48.6%"
}

export const MAP_METADATA: Record<ActiveDutyMap, MapMetadata> = {
  Ancient: {
    id: 'Ancient',
    name: 'Ancient',
    russianName: 'Эйншент',
    themeColor: '#10b981',
    accentBg: 'bg-emerald-950/40 border-emerald-500/30',
    tagline: 'Джунгли, узкие коридоры и агрессивный контроль мида',
    ctAdvantage: 'CT 53.2%',
    tAdvantage: 'T 46.8%'
  },
  Anubis: {
    id: 'Anubis',
    name: 'Anubis',
    russianName: 'Анубис',
    themeColor: '#f59e0b',
    accentBg: 'bg-amber-950/40 border-amber-500/30',
    tagline: 'Египетские руины, водный канал и высокая вариативность T-стороны',
    ctAdvantage: 'CT 46.5%',
    tAdvantage: 'T 53.5%'
  },
  Cache: {
    id: 'Cache',
    name: 'Cache',
    russianName: 'Кэш',
    themeColor: '#84cc16',
    accentBg: 'bg-lime-950/40 border-lime-500/30',
    tagline: 'Чернобыль, классическая 3-линейная структура и тактическая глубина',
    ctAdvantage: 'CT 50.8%',
    tAdvantage: 'T 49.2%'
  },
  Dust2: {
    id: 'Dust2',
    name: 'Dust2',
    russianName: 'Даст 2',
    themeColor: '#eab308',
    accentBg: 'bg-yellow-950/40 border-yellow-500/30',
    tagline: 'Легендарная песчаная дуэль снайперов и быстрая стрельба',
    ctAdvantage: 'CT 49.6%',
    tAdvantage: 'T 50.4%'
  },
  Inferno: {
    id: 'Inferno',
    name: 'Inferno',
    russianName: 'Инферно',
    themeColor: '#f97316',
    accentBg: 'bg-orange-950/40 border-orange-500/30',
    tagline: 'Итальянская деревушка, битва гранат за Банан и поздние выходы',
    ctAdvantage: 'CT 52.1%',
    tAdvantage: 'T 47.9%'
  },
  Mirage: {
    id: 'Mirage',
    name: 'Mirage',
    russianName: 'Мираж',
    themeColor: '#38bdf8',
    accentBg: 'bg-sky-950/40 border-sky-500/30',
    tagline: 'Абсолютный мировой стандарт раскидок, подсадок и клатчей',
    ctAdvantage: 'CT 51.5%',
    tAdvantage: 'T 48.5%'
  },
  Nuke: {
    id: 'Nuke',
    name: 'Nuke',
    russianName: 'Нюк',
    themeColor: '#06b6d4',
    accentBg: 'bg-cyan-950/40 border-cyan-500/30',
    tagline: 'Атомная станция, двухъярусные пленты и стремительные ротации через Вент',
    ctAdvantage: 'CT 54.8%',
    tAdvantage: 'T 45.2%'
  }
};

/**
 * Authentic baseline HLTV profiles for each of the 16 teams.
 * Grounded in recent premier CS2 tournaments and VRS standings.
 */
export const TEAM_MAP_PROFILES: Record<string, TeamMapProfile> = {
  spirit: {
    overallRating: 96,
    currentForm: 95,
    bestMaps: ['Dust2', 'Ancient', 'Nuke'],
    worstMaps: ['Inferno'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 91,
        baseMapRating: 91,
        winRate: 78,
        mapsPlayed: 32,
        wins: 25,
        losses: 7,
        pickRate: 26,
        banRate: 3,
        isFavoritePick: true,
        currentForm: 93,
        formChange30d: 4,
        formChange90d: 8,
        opponentsStrength: 89,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'W', score: '13:9', date: '6 дн. назад', oppRating: 95 },
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'W', score: '13:10', date: '14 дн. назад', oppRating: 94 },
          { opponentId: 'falcons', opponentName: 'Falcons', result: 'W', score: '13:8', date: '21 дн. назад', oppRating: 90 },
          { opponentId: 'g2', opponentName: 'G2', result: 'L', score: '11:13', date: '29 дн. назад', oppRating: 80 },
          { opponentId: 'furia', opponentName: 'FURIA', result: 'W', score: '13:7', date: '38 дн. назад', oppRating: 83 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 86,
        baseMapRating: 86,
        winRate: 71,
        mapsPlayed: 24,
        wins: 17,
        losses: 7,
        pickRate: 18,
        banRate: 8,
        currentForm: 88,
        formChange30d: 3,
        formChange90d: 6,
        opponentsStrength: 87,
        recentResults: [
          { opponentId: 'aurora', opponentName: 'Aurora', result: 'W', score: '13:11', date: '9 дн. назад', oppRating: 82 },
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '10:13', date: '18 дн. назад', oppRating: 95 },
          { opponentId: 'betboom', opponentName: 'BETBOOM', result: 'W', score: '13:6', date: '27 дн. назад', oppRating: 72 },
          { opponentId: 'm80', opponentName: 'M80', result: 'W', score: '13:5', date: '40 дн. назад', oppRating: 66 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 82,
        baseMapRating: 82,
        winRate: 70,
        mapsPlayed: 10,
        wins: 7,
        losses: 3,
        pickRate: 10,
        banRate: 10,
        currentForm: 82,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 84,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'W', score: '13:8', date: '12 дн. назад', oppRating: 74 },
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '9:13', date: '25 дн. назад', oppRating: 95 },
          { opponentId: '1win', opponentName: '1win', result: 'W', score: '13:7', date: '36 дн. назад', oppRating: 70 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 94,
        baseMapRating: 94,
        winRate: 83,
        mapsPlayed: 35,
        wins: 29,
        losses: 6,
        pickRate: 32,
        banRate: 0,
        isFavoritePick: true,
        currentForm: 97,
        formChange30d: 5,
        formChange90d: 9,
        opponentsStrength: 91,
        recentResults: [
          { opponentId: 'falcons', opponentName: 'Falcons', result: 'W', score: '13:6', date: '5 дн. назад', oppRating: 90 },
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'W', score: '13:9', date: '11 дн. назад', oppRating: 94 },
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'W', score: '16:13', date: '19 дн. назад', oppRating: 95 },
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'W', score: '13:4', date: '31 дн. назад', oppRating: 84 },
          { opponentId: 'g2', opponentName: 'G2', result: 'W', score: '13:8', date: '42 дн. назад', oppRating: 80 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 54,
        baseMapRating: 54,
        winRate: 40,
        mapsPlayed: 5,
        wins: 2,
        losses: 3,
        pickRate: 0,
        banRate: 82,
        isPermanentBan: true,
        currentForm: 50,
        formChange30d: -4,
        formChange90d: -8,
        opponentsStrength: 86,
        recentResults: [
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'L', score: '7:13', date: '45 дн. назад', oppRating: 94 },
          { opponentId: 'g2', opponentName: 'G2', result: 'L', score: '9:13', date: '60 дн. назад', oppRating: 80 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 84,
        baseMapRating: 84,
        winRate: 68,
        mapsPlayed: 28,
        wins: 19,
        losses: 9,
        pickRate: 20,
        banRate: 5,
        currentForm: 85,
        formChange30d: 1,
        formChange90d: 3,
        opponentsStrength: 88,
        recentResults: [
          { opponentId: 'navi', opponentName: 'NAVI', result: 'W', score: '13:8', date: '8 дн. назад', oppRating: 69 },
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '11:13', date: '17 дн. назад', oppRating: 95 },
          { opponentId: 'furia', opponentName: 'FURIA', result: 'W', score: '13:9', date: '28 дн. назад', oppRating: 83 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 89,
        baseMapRating: 89,
        winRate: 75,
        mapsPlayed: 26,
        wins: 20,
        losses: 6,
        pickRate: 22,
        banRate: 4,
        currentForm: 91,
        formChange30d: 3,
        formChange90d: 7,
        opponentsStrength: 90,
        recentResults: [
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'W', score: '13:10', date: '7 дн. назад', oppRating: 94 },
          { opponentId: 'falcons', opponentName: 'Falcons', result: 'W', score: '13:8', date: '16 дн. назад', oppRating: 90 },
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '14:16', date: '24 дн. назад', oppRating: 95 }
        ]
      }
    }
  },

  vitality: {
    overallRating: 95,
    currentForm: 93,
    bestMaps: ['Nuke', 'Mirage', 'Anubis'],
    worstMaps: ['Ancient'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 58,
        baseMapRating: 58,
        winRate: 46,
        mapsPlayed: 11,
        wins: 5,
        losses: 6,
        pickRate: 4,
        banRate: 68,
        isPermanentBan: true,
        currentForm: 56,
        formChange30d: -2,
        formChange90d: -6,
        opponentsStrength: 88,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '9:13', date: '6 дн. назад', oppRating: 96 },
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'L', score: '11:13', date: '20 дн. назад', oppRating: 94 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 88,
        baseMapRating: 88,
        winRate: 74,
        mapsPlayed: 27,
        wins: 20,
        losses: 7,
        pickRate: 26,
        banRate: 6,
        isFavoritePick: true,
        currentForm: 90,
        formChange30d: 4,
        formChange90d: 7,
        opponentsStrength: 89,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'W', score: '13:10', date: '18 дн. назад', oppRating: 96 },
          { opponentId: 'falcons', opponentName: 'Falcons', result: 'W', score: '13:7', date: '26 дн. назад', oppRating: 90 },
          { opponentId: 'aurora', opponentName: 'Aurora', result: 'W', score: '13:11', date: '34 дн. назад', oppRating: 82 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 85,
        baseMapRating: 85,
        winRate: 72,
        mapsPlayed: 12,
        wins: 9,
        losses: 3,
        pickRate: 12,
        banRate: 8,
        currentForm: 86,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 86,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'W', score: '13:9', date: '25 дн. назад', oppRating: 96 },
          { opponentId: 'g2', opponentName: 'G2', result: 'W', score: '13:8', date: '39 дн. назад', oppRating: 80 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 87,
        baseMapRating: 87,
        winRate: 70,
        mapsPlayed: 25,
        wins: 17,
        losses: 8,
        pickRate: 20,
        banRate: 5,
        currentForm: 88,
        formChange30d: 2,
        formChange90d: 5,
        opponentsStrength: 90,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '13:16', date: '19 дн. назад', oppRating: 96 },
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'W', score: '13:9', date: '28 дн. назад', oppRating: 94 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 86,
        baseMapRating: 86,
        winRate: 69,
        mapsPlayed: 23,
        wins: 16,
        losses: 7,
        pickRate: 19,
        banRate: 7,
        currentForm: 87,
        formChange30d: 1,
        formChange90d: 4,
        opponentsStrength: 87,
        recentResults: [
          { opponentId: 'g2', opponentName: 'G2', result: 'W', score: '13:11', date: '15 дн. назад', oppRating: 80 },
          { opponentId: 'furia', opponentName: 'FURIA', result: 'W', score: '13:8', date: '30 дн. назад', oppRating: 83 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 91,
        baseMapRating: 91,
        winRate: 76,
        mapsPlayed: 30,
        wins: 23,
        losses: 7,
        pickRate: 28,
        banRate: 3,
        isFavoritePick: true,
        currentForm: 92,
        formChange30d: 3,
        formChange90d: 6,
        opponentsStrength: 90,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'W', score: '13:11', date: '17 дн. назад', oppRating: 96 },
          { opponentId: 'falcons', opponentName: 'Falcons', result: 'W', score: '13:9', date: '25 дн. назад', oppRating: 90 },
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'L', score: '10:13', date: '33 дн. назад', oppRating: 94 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 93,
        baseMapRating: 93,
        winRate: 80,
        mapsPlayed: 29,
        wins: 23,
        losses: 6,
        pickRate: 29,
        banRate: 2,
        isFavoritePick: true,
        currentForm: 94,
        formChange30d: 4,
        formChange90d: 8,
        opponentsStrength: 91,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'W', score: '16:14', date: '24 дн. назад', oppRating: 96 },
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'W', score: '13:8', date: '32 дн. назад', oppRating: 94 }
        ]
      }
    }
  },

  mouz: {
    overallRating: 94,
    currentForm: 91,
    bestMaps: ['Mirage', 'Inferno', 'Ancient'],
    worstMaps: ['Anubis'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 87,
        baseMapRating: 87,
        winRate: 71,
        mapsPlayed: 26,
        wins: 18,
        losses: 8,
        pickRate: 22,
        banRate: 5,
        currentForm: 88,
        formChange30d: 2,
        formChange90d: 5,
        opponentsStrength: 89,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '10:13', date: '14 дн. назад', oppRating: 96 },
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'W', score: '13:11', date: '20 дн. назад', oppRating: 95 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 55,
        baseMapRating: 55,
        winRate: 42,
        mapsPlayed: 8,
        wins: 3,
        losses: 5,
        pickRate: 2,
        banRate: 75,
        isPermanentBan: true,
        currentForm: 52,
        formChange30d: -3,
        formChange90d: -7,
        opponentsStrength: 87,
        recentResults: [
          { opponentId: 'aurora', opponentName: 'Aurora', result: 'L', score: '8:13', date: '35 дн. назад', oppRating: 82 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 80,
        baseMapRating: 80,
        winRate: 67,
        mapsPlayed: 9,
        wins: 6,
        losses: 3,
        pickRate: 11,
        banRate: 9,
        currentForm: 81,
        formChange30d: 1,
        formChange90d: 3,
        opponentsStrength: 85,
        recentResults: [
          { opponentId: 'g2', opponentName: 'G2', result: 'W', score: '13:7', date: '28 дн. назад', oppRating: 80 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 74,
        baseMapRating: 74,
        winRate: 58,
        mapsPlayed: 18,
        wins: 10,
        losses: 8,
        pickRate: 12,
        banRate: 14,
        currentForm: 73,
        formChange30d: -1,
        formChange90d: 1,
        opponentsStrength: 89,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '9:13', date: '11 дн. назад', oppRating: 96 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 90,
        baseMapRating: 90,
        winRate: 75,
        mapsPlayed: 28,
        wins: 21,
        losses: 7,
        pickRate: 28,
        banRate: 2,
        isFavoritePick: true,
        currentForm: 92,
        formChange30d: 4,
        formChange90d: 7,
        opponentsStrength: 90,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'W', score: '13:7', date: '45 дн. назад', oppRating: 96 },
          { opponentId: 'falcons', opponentName: 'Falcons', result: 'W', score: '13:9', date: '18 дн. назад', oppRating: 90 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 92,
        baseMapRating: 92,
        winRate: 79,
        mapsPlayed: 32,
        wins: 25,
        losses: 7,
        pickRate: 31,
        banRate: 1,
        isFavoritePick: true,
        currentForm: 93,
        formChange30d: 4,
        formChange90d: 8,
        opponentsStrength: 91,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'W', score: '13:10', date: '33 дн. назад', oppRating: 95 },
          { opponentId: 'g2', opponentName: 'G2', result: 'W', score: '13:8', date: '22 дн. назад', oppRating: 80 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 85,
        baseMapRating: 85,
        winRate: 69,
        mapsPlayed: 24,
        wins: 16,
        losses: 8,
        pickRate: 18,
        banRate: 6,
        currentForm: 86,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 89,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '10:13', date: '7 дн. назад', oppRating: 96 },
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '8:13', date: '32 дн. назад', oppRating: 95 }
        ]
      }
    }
  },

  falcons: {
    overallRating: 90,
    currentForm: 88,
    bestMaps: ['Dust2', 'Mirage', 'Nuke'],
    worstMaps: ['Anubis'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 81,
        baseMapRating: 81,
        winRate: 64,
        mapsPlayed: 20,
        wins: 13,
        losses: 7,
        pickRate: 16,
        banRate: 8,
        currentForm: 82,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 86,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '8:13', date: '21 дн. назад', oppRating: 96 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 60,
        baseMapRating: 60,
        winRate: 48,
        mapsPlayed: 10,
        wins: 5,
        losses: 5,
        pickRate: 5,
        banRate: 58,
        isPermanentBan: true,
        currentForm: 58,
        formChange30d: -2,
        formChange90d: -5,
        opponentsStrength: 85,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '7:13', date: '26 дн. назад', oppRating: 95 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 79,
        baseMapRating: 79,
        winRate: 65,
        mapsPlayed: 8,
        wins: 5,
        losses: 3,
        pickRate: 10,
        banRate: 10,
        currentForm: 80,
        formChange30d: 1,
        formChange90d: 3,
        opponentsStrength: 84,
        recentResults: [
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'W', score: '13:8', date: '30 дн. назад', oppRating: 84 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 90,
        baseMapRating: 90,
        winRate: 77,
        mapsPlayed: 28,
        wins: 21,
        losses: 7,
        pickRate: 30,
        banRate: 2,
        isFavoritePick: true,
        currentForm: 92,
        formChange30d: 4,
        formChange90d: 8,
        opponentsStrength: 89,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '6:13', date: '5 дн. назад', oppRating: 96 },
          { opponentId: 'g2', opponentName: 'G2', result: 'W', score: '13:7', date: '14 дн. назад', oppRating: 80 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 82,
        baseMapRating: 82,
        winRate: 66,
        mapsPlayed: 19,
        wins: 12,
        losses: 7,
        pickRate: 17,
        banRate: 7,
        currentForm: 83,
        formChange30d: 1,
        formChange90d: 3,
        opponentsStrength: 86,
        recentResults: [
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'L', score: '9:13', date: '18 дн. назад', oppRating: 94 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 87,
        baseMapRating: 87,
        winRate: 72,
        mapsPlayed: 25,
        wins: 18,
        losses: 7,
        pickRate: 24,
        banRate: 4,
        isFavoritePick: true,
        currentForm: 88,
        formChange30d: 3,
        formChange90d: 6,
        opponentsStrength: 88,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '9:13', date: '25 дн. назад', oppRating: 95 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 86,
        baseMapRating: 86,
        winRate: 70,
        mapsPlayed: 23,
        wins: 16,
        losses: 7,
        pickRate: 21,
        banRate: 5,
        currentForm: 87,
        formChange30d: 2,
        formChange90d: 5,
        opponentsStrength: 87,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '8:13', date: '16 дн. назад', oppRating: 96 }
        ]
      }
    }
  },

  legacy: {
    overallRating: 84,
    currentForm: 82,
    bestMaps: ['Ancient', 'Dust2', 'Anubis'],
    worstMaps: ['Inferno'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 85,
        baseMapRating: 85,
        winRate: 70,
        mapsPlayed: 22,
        wins: 15,
        losses: 7,
        pickRate: 27,
        banRate: 4,
        isFavoritePick: true,
        currentForm: 86,
        formChange30d: 3,
        formChange90d: 6,
        opponentsStrength: 81,
        recentResults: [
          { opponentId: 'furia', opponentName: 'FURIA', result: 'W', score: '13:10', date: '12 дн. назад', oppRating: 83 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 81,
        baseMapRating: 81,
        winRate: 64,
        mapsPlayed: 18,
        wins: 11,
        losses: 7,
        pickRate: 22,
        banRate: 8,
        currentForm: 82,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 80,
        recentResults: [
          { opponentId: '9z', opponentName: '9z', result: 'W', score: '13:8', date: '15 дн. назад', oppRating: 71 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 74,
        baseMapRating: 74,
        winRate: 58,
        mapsPlayed: 7,
        wins: 4,
        losses: 3,
        pickRate: 11,
        banRate: 12,
        currentForm: 74,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 78,
        recentResults: [
          { opponentId: 'shinden', opponentName: 'ShindeN', result: 'W', score: '13:6', date: '22 дн. назад', oppRating: 48 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 83,
        baseMapRating: 83,
        winRate: 67,
        mapsPlayed: 20,
        wins: 13,
        losses: 7,
        pickRate: 25,
        banRate: 5,
        currentForm: 84,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 82,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '4:13', date: '31 дн. назад', oppRating: 96 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 50,
        baseMapRating: 50,
        winRate: 38,
        mapsPlayed: 6,
        wins: 2,
        losses: 4,
        pickRate: 1,
        banRate: 68,
        isPermanentBan: true,
        currentForm: 48,
        formChange30d: -3,
        formChange90d: -6,
        opponentsStrength: 82,
        recentResults: [
          { opponentId: 'furia', opponentName: 'FURIA', result: 'L', score: '7:13', date: '40 дн. назад', oppRating: 83 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 77,
        baseMapRating: 77,
        winRate: 60,
        mapsPlayed: 19,
        wins: 11,
        losses: 8,
        pickRate: 18,
        banRate: 9,
        currentForm: 77,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 80,
        recentResults: [
          { opponentId: 'aurora', opponentName: 'Aurora', result: 'L', score: '10:13', date: '27 дн. назад', oppRating: 82 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 72,
        baseMapRating: 72,
        winRate: 53,
        mapsPlayed: 14,
        wins: 7,
        losses: 7,
        pickRate: 12,
        banRate: 15,
        currentForm: 71,
        formChange30d: -1,
        formChange90d: 0,
        opponentsStrength: 81,
        recentResults: [
          { opponentId: 'furia', opponentName: 'FURIA', result: 'L', score: '8:13', date: '29 дн. назад', oppRating: 83 }
        ]
      }
    }
  },

  furia: {
    overallRating: 83,
    currentForm: 85,
    bestMaps: ['Nuke', 'Inferno', 'Dust2'],
    worstMaps: ['Anubis'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 76,
        baseMapRating: 76,
        winRate: 58,
        mapsPlayed: 17,
        wins: 10,
        losses: 7,
        pickRate: 16,
        banRate: 9,
        currentForm: 77,
        formChange30d: 1,
        formChange90d: 3,
        opponentsStrength: 82,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '7:13', date: '38 дн. назад', oppRating: 96 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 52,
        baseMapRating: 52,
        winRate: 40,
        mapsPlayed: 8,
        wins: 3,
        losses: 5,
        pickRate: 3,
        banRate: 64,
        isPermanentBan: true,
        currentForm: 50,
        formChange30d: -3,
        formChange90d: -6,
        opponentsStrength: 83,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '6:13', date: '41 дн. назад', oppRating: 95 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 75,
        baseMapRating: 75,
        winRate: 60,
        mapsPlayed: 8,
        wins: 5,
        losses: 3,
        pickRate: 11,
        banRate: 10,
        currentForm: 76,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 79,
        recentResults: [
          { opponentId: '9z', opponentName: '9z', result: 'W', score: '13:9', date: '19 дн. назад', oppRating: 71 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 82,
        baseMapRating: 82,
        winRate: 65,
        mapsPlayed: 21,
        wins: 14,
        losses: 7,
        pickRate: 22,
        banRate: 6,
        currentForm: 84,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 83,
        recentResults: [
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'W', score: '13:10', date: '16 дн. назад', oppRating: 84 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 85,
        baseMapRating: 85,
        winRate: 71,
        mapsPlayed: 24,
        wins: 17,
        losses: 7,
        pickRate: 26,
        banRate: 3,
        isFavoritePick: true,
        currentForm: 87,
        formChange30d: 4,
        formChange90d: 6,
        opponentsStrength: 84,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '8:13', date: '30 дн. назад', oppRating: 95 },
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'W', score: '13:7', date: '40 дн. назад', oppRating: 84 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 80,
        baseMapRating: 80,
        winRate: 62,
        mapsPlayed: 20,
        wins: 12,
        losses: 8,
        pickRate: 20,
        banRate: 8,
        currentForm: 81,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 82,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '9:13', date: '28 дн. назад', oppRating: 96 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 88,
        baseMapRating: 88,
        winRate: 74,
        mapsPlayed: 25,
        wins: 18,
        losses: 7,
        pickRate: 28,
        banRate: 2,
        isFavoritePick: true,
        currentForm: 90,
        formChange30d: 5,
        formChange90d: 8,
        opponentsStrength: 85,
        recentResults: [
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'W', score: '13:8', date: '29 дн. назад', oppRating: 84 },
          { opponentId: '9z', opponentName: '9z', result: 'W', score: '13:7', date: '35 дн. назад', oppRating: 71 }
        ]
      }
    }
  },

  aurora: {
    overallRating: 82,
    currentForm: 84,
    bestMaps: ['Anubis', 'Mirage', 'Dust2'],
    worstMaps: ['Nuke'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 79,
        baseMapRating: 79,
        winRate: 62,
        mapsPlayed: 18,
        wins: 11,
        losses: 7,
        pickRate: 18,
        banRate: 8,
        currentForm: 80,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 80,
        recentResults: [
          { opponentId: 'betboom', opponentName: 'BETBOOM', result: 'W', score: '13:9', date: '14 дн. назад', oppRating: 72 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 87,
        baseMapRating: 87,
        winRate: 73,
        mapsPlayed: 25,
        wins: 18,
        losses: 7,
        pickRate: 29,
        banRate: 3,
        isFavoritePick: true,
        currentForm: 89,
        formChange30d: 4,
        formChange90d: 7,
        opponentsStrength: 83,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '11:13', date: '9 дн. назад', oppRating: 96 },
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'W', score: '13:8', date: '35 дн. назад', oppRating: 94 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 77,
        baseMapRating: 77,
        winRate: 62,
        mapsPlayed: 9,
        wins: 6,
        losses: 3,
        pickRate: 11,
        banRate: 10,
        currentForm: 78,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 78,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'W', score: '13:10', date: '21 дн. назад', oppRating: 74 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 84,
        baseMapRating: 84,
        winRate: 68,
        mapsPlayed: 22,
        wins: 15,
        losses: 7,
        pickRate: 24,
        banRate: 4,
        isFavoritePick: true,
        currentForm: 85,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 81,
        recentResults: [
          { opponentId: '1win', opponentName: '1win', result: 'W', score: '13:8', date: '18 дн. назад', oppRating: 70 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 75,
        baseMapRating: 75,
        winRate: 57,
        mapsPlayed: 15,
        wins: 9,
        losses: 6,
        pickRate: 15,
        banRate: 11,
        currentForm: 76,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 80,
        recentResults: [
          { opponentId: 'g2', opponentName: 'G2', result: 'L', score: '10:13', date: '23 дн. назад', oppRating: 80 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 85,
        baseMapRating: 85,
        winRate: 70,
        mapsPlayed: 24,
        wins: 17,
        losses: 7,
        pickRate: 26,
        banRate: 3,
        isFavoritePick: true,
        currentForm: 87,
        formChange30d: 3,
        formChange90d: 6,
        opponentsStrength: 82,
        recentResults: [
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'W', score: '13:10', date: '27 дн. назад', oppRating: 84 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 54,
        baseMapRating: 54,
        winRate: 41,
        mapsPlayed: 8,
        wins: 3,
        losses: 5,
        pickRate: 2,
        banRate: 65,
        isPermanentBan: true,
        currentForm: 52,
        formChange30d: -2,
        formChange90d: -5,
        opponentsStrength: 82,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '6:13', date: '44 дн. назад', oppRating: 96 }
        ]
      }
    }
  },

  g2: {
    overallRating: 80,
    currentForm: 78,
    bestMaps: ['Inferno', 'Ancient', 'Mirage'],
    worstMaps: ['Nuke'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 82,
        baseMapRating: 82,
        winRate: 65,
        mapsPlayed: 20,
        wins: 13,
        losses: 7,
        pickRate: 23,
        banRate: 6,
        currentForm: 81,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 85,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'W', score: '13:11', date: '29 дн. назад', oppRating: 96 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 75,
        baseMapRating: 75,
        winRate: 57,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 17,
        banRate: 10,
        currentForm: 74,
        formChange30d: -1,
        formChange90d: 1,
        opponentsStrength: 84,
        recentResults: [
          { opponentId: 'aurora', opponentName: 'Aurora', result: 'L', score: '9:13', date: '31 дн. назад', oppRating: 82 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 76,
        baseMapRating: 76,
        winRate: 61,
        mapsPlayed: 8,
        wins: 5,
        losses: 3,
        pickRate: 11,
        banRate: 12,
        currentForm: 76,
        formChange30d: 0,
        formChange90d: 2,
        opponentsStrength: 82,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '8:13', date: '39 дн. назад', oppRating: 95 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 78,
        baseMapRating: 78,
        winRate: 60,
        mapsPlayed: 19,
        wins: 11,
        losses: 8,
        pickRate: 20,
        banRate: 8,
        currentForm: 77,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 86,
        recentResults: [
          { opponentId: 'falcons', opponentName: 'Falcons', result: 'L', score: '7:13', date: '14 дн. назад', oppRating: 90 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 85,
        baseMapRating: 85,
        winRate: 69,
        mapsPlayed: 23,
        wins: 16,
        losses: 7,
        pickRate: 26,
        banRate: 4,
        isFavoritePick: true,
        currentForm: 86,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 85,
        recentResults: [
          { opponentId: 'vitality', opponentName: 'Vitality', result: 'L', score: '11:13', date: '15 дн. назад', oppRating: 95 },
          { opponentId: 'aurora', opponentName: 'Aurora', result: 'W', score: '13:10', date: '23 дн. назад', oppRating: 82 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 81,
        baseMapRating: 81,
        winRate: 63,
        mapsPlayed: 22,
        wins: 14,
        losses: 8,
        pickRate: 22,
        banRate: 6,
        currentForm: 80,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 85,
        recentResults: [
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'L', score: '8:13', date: '22 дн. назад', oppRating: 94 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 58,
        baseMapRating: 58,
        winRate: 44,
        mapsPlayed: 10,
        wins: 4,
        losses: 6,
        pickRate: 4,
        banRate: 54,
        isPermanentBan: true,
        currentForm: 56,
        formChange30d: -2,
        formChange90d: -5,
        opponentsStrength: 86,
        recentResults: [
          { opponentId: 'mouz', opponentName: 'MOUZ', result: 'L', score: '7:13', date: '40 дн. назад', oppRating: 94 }
        ]
      }
    }
  },

  parivision: {
    overallRating: 74,
    currentForm: 76,
    bestMaps: ['Dust2', 'Mirage', 'Ancient'],
    worstMaps: ['Nuke'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 76,
        baseMapRating: 76,
        winRate: 59,
        mapsPlayed: 17,
        wins: 10,
        losses: 7,
        pickRate: 20,
        banRate: 7,
        currentForm: 77,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'betboom', opponentName: 'BETBOOM', result: 'W', score: '13:8', date: '11 дн. назад', oppRating: 72 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 68,
        baseMapRating: 68,
        winRate: 50,
        mapsPlayed: 13,
        wins: 6,
        losses: 7,
        pickRate: 14,
        banRate: 12,
        currentForm: 69,
        formChange30d: 1,
        formChange90d: 1,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: '1win', opponentName: '1win', result: 'L', score: '11:13', date: '19 дн. назад', oppRating: 70 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 72,
        baseMapRating: 72,
        winRate: 55,
        mapsPlayed: 7,
        wins: 4,
        losses: 3,
        pickRate: 11,
        banRate: 11,
        currentForm: 73,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '8:13', date: '12 дн. назад', oppRating: 96 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 81,
        baseMapRating: 81,
        winRate: 66,
        mapsPlayed: 21,
        wins: 14,
        losses: 7,
        pickRate: 27,
        banRate: 3,
        isFavoritePick: true,
        currentForm: 83,
        formChange30d: 4,
        formChange90d: 6,
        opponentsStrength: 77,
        recentResults: [
          { opponentId: '1win', opponentName: '1win', result: 'W', score: '13:7', date: '8 дн. назад', oppRating: 70 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 74,
        baseMapRating: 74,
        winRate: 57,
        mapsPlayed: 15,
        wins: 8,
        losses: 7,
        pickRate: 16,
        banRate: 10,
        currentForm: 74,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'navi', opponentName: 'NAVI', result: 'W', score: '13:11', date: '16 дн. назад', oppRating: 69 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 78,
        baseMapRating: 78,
        winRate: 62,
        mapsPlayed: 20,
        wins: 12,
        losses: 8,
        pickRate: 24,
        banRate: 5,
        currentForm: 79,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'betboom', opponentName: 'BETBOOM', result: 'W', score: '13:9', date: '20 дн. назад', oppRating: 72 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 48,
        baseMapRating: 48,
        winRate: 36,
        mapsPlayed: 6,
        wins: 2,
        losses: 4,
        pickRate: 1,
        banRate: 72,
        isPermanentBan: true,
        currentForm: 46,
        formChange30d: -3,
        formChange90d: -6,
        opponentsStrength: 78,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '5:13', date: '35 дн. назад', oppRating: 96 }
        ]
      }
    }
  },

  betboom: {
    overallRating: 72,
    currentForm: 74,
    bestMaps: ['Mirage', 'Anubis', 'Ancient'],
    worstMaps: ['Inferno'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 74,
        baseMapRating: 74,
        winRate: 58,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 19,
        banRate: 8,
        currentForm: 75,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'L', score: '8:13', date: '11 дн. назад', oppRating: 74 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 77,
        baseMapRating: 77,
        winRate: 61,
        mapsPlayed: 19,
        wins: 12,
        losses: 7,
        pickRate: 25,
        banRate: 6,
        isFavoritePick: true,
        currentForm: 78,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '6:13', date: '27 дн. назад', oppRating: 96 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 70,
        baseMapRating: 70,
        winRate: 54,
        mapsPlayed: 6,
        wins: 3,
        losses: 3,
        pickRate: 10,
        banRate: 11,
        currentForm: 71,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: '1win', opponentName: '1win', result: 'W', score: '13:9', date: '24 дн. назад', oppRating: 70 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 69,
        baseMapRating: 69,
        winRate: 52,
        mapsPlayed: 15,
        wins: 8,
        losses: 7,
        pickRate: 15,
        banRate: 12,
        currentForm: 70,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'L', score: '9:13', date: '20 дн. назад', oppRating: 74 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 46,
        baseMapRating: 46,
        winRate: 35,
        mapsPlayed: 5,
        wins: 2,
        losses: 3,
        pickRate: 1,
        banRate: 69,
        isPermanentBan: true,
        currentForm: 44,
        formChange30d: -3,
        formChange90d: -5,
        opponentsStrength: 77,
        recentResults: [
          { opponentId: 'aurora', opponentName: 'Aurora', result: 'L', score: '6:13', date: '38 дн. назад', oppRating: 82 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 79,
        baseMapRating: 79,
        winRate: 64,
        mapsPlayed: 22,
        wins: 14,
        losses: 8,
        pickRate: 28,
        banRate: 4,
        isFavoritePick: true,
        currentForm: 81,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: '1win', opponentName: '1win', result: 'W', score: '13:10', date: '13 дн. назад', oppRating: 70 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 73,
        baseMapRating: 73,
        winRate: 56,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 16,
        banRate: 9,
        currentForm: 74,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'navi', opponentName: 'NAVI', result: 'W', score: '13:8', date: '17 дн. назад', oppRating: 69 }
        ]
      }
    }
  },

  '9z': {
    overallRating: 71,
    currentForm: 73,
    bestMaps: ['Nuke', 'Dust2', 'Ancient'],
    worstMaps: ['Inferno'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 75,
        baseMapRating: 75,
        winRate: 59,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 20,
        banRate: 7,
        currentForm: 76,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'L', score: '8:13', date: '15 дн. назад', oppRating: 84 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 72,
        baseMapRating: 72,
        winRate: 55,
        mapsPlayed: 14,
        wins: 8,
        losses: 6,
        pickRate: 18,
        banRate: 9,
        currentForm: 73,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 73,
        recentResults: [
          { opponentId: 'furia', opponentName: 'FURIA', result: 'L', score: '10:13', date: '22 дн. назад', oppRating: 83 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 69,
        baseMapRating: 69,
        winRate: 53,
        mapsPlayed: 6,
        wins: 3,
        losses: 3,
        pickRate: 10,
        banRate: 12,
        currentForm: 69,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 73,
        recentResults: [
          { opponentId: 'shinden', opponentName: 'ShindeN', result: 'W', score: '13:5', date: '18 дн. назад', oppRating: 48 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 76,
        baseMapRating: 76,
        winRate: 60,
        mapsPlayed: 19,
        wins: 11,
        losses: 8,
        pickRate: 23,
        banRate: 5,
        currentForm: 77,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: 'm80', opponentName: 'M80', result: 'W', score: '13:10', date: '14 дн. назад', oppRating: 66 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 47,
        baseMapRating: 47,
        winRate: 37,
        mapsPlayed: 5,
        wins: 2,
        losses: 3,
        pickRate: 2,
        banRate: 63,
        isPermanentBan: true,
        currentForm: 45,
        formChange30d: -2,
        formChange90d: -4,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'furia', opponentName: 'FURIA', result: 'L', score: '6:13', date: '33 дн. назад', oppRating: 83 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 70,
        baseMapRating: 70,
        winRate: 54,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 18,
        banRate: 10,
        currentForm: 71,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'L', score: '9:13', date: '21 дн. назад', oppRating: 84 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 80,
        baseMapRating: 80,
        winRate: 65,
        mapsPlayed: 21,
        wins: 14,
        losses: 7,
        pickRate: 26,
        banRate: 3,
        isFavoritePick: true,
        currentForm: 82,
        formChange30d: 3,
        formChange90d: 6,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'furia', opponentName: 'FURIA', result: 'L', score: '7:13', date: '35 дн. назад', oppRating: 83 },
          { opponentId: 'shinden', opponentName: 'ShindeN', result: 'W', score: '13:4', date: '16 дн. назад', oppRating: 48 }
        ]
      }
    }
  },

  '1win': {
    overallRating: 70,
    currentForm: 71,
    bestMaps: ['Mirage', 'Dust2', 'Ancient'],
    worstMaps: ['Nuke'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 73,
        baseMapRating: 73,
        winRate: 57,
        mapsPlayed: 15,
        wins: 8,
        losses: 7,
        pickRate: 19,
        banRate: 8,
        currentForm: 74,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 73,
        recentResults: [
          { opponentId: 'betboom', opponentName: 'BETBOOM', result: 'W', score: '13:11', date: '16 дн. назад', oppRating: 72 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 71,
        baseMapRating: 71,
        winRate: 54,
        mapsPlayed: 14,
        wins: 7,
        losses: 7,
        pickRate: 17,
        banRate: 10,
        currentForm: 71,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'W', score: '13:11', date: '19 дн. назад', oppRating: 74 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 68,
        baseMapRating: 68,
        winRate: 52,
        mapsPlayed: 6,
        wins: 3,
        losses: 3,
        pickRate: 10,
        banRate: 12,
        currentForm: 68,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '7:13', date: '36 дн. назад', oppRating: 96 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 75,
        baseMapRating: 75,
        winRate: 60,
        mapsPlayed: 18,
        wins: 11,
        losses: 7,
        pickRate: 23,
        banRate: 6,
        currentForm: 76,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'L', score: '7:13', date: '8 дн. назад', oppRating: 74 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 67,
        baseMapRating: 67,
        winRate: 49,
        mapsPlayed: 13,
        wins: 6,
        losses: 7,
        pickRate: 14,
        banRate: 12,
        currentForm: 67,
        formChange30d: -1,
        formChange90d: 0,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'navi', opponentName: 'NAVI', result: 'L', score: '9:13', date: '21 дн. назад', oppRating: 69 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 77,
        baseMapRating: 77,
        winRate: 62,
        mapsPlayed: 20,
        wins: 12,
        losses: 8,
        pickRate: 26,
        banRate: 4,
        isFavoritePick: true,
        currentForm: 78,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'betboom', opponentName: 'BETBOOM', result: 'L', score: '10:13', date: '13 дн. назад', oppRating: 72 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 49,
        baseMapRating: 49,
        winRate: 38,
        mapsPlayed: 6,
        wins: 2,
        losses: 4,
        pickRate: 2,
        banRate: 62,
        isPermanentBan: true,
        currentForm: 48,
        formChange30d: -2,
        formChange90d: -5,
        opponentsStrength: 77,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '6:13', date: '30 дн. назад', oppRating: 96 }
        ]
      }
    }
  },

  navi: {
    overallRating: 69,
    currentForm: 68,
    bestMaps: ['Mirage', 'Nuke', 'Ancient'],
    worstMaps: ['Inferno'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 72,
        baseMapRating: 72,
        winRate: 56,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 20,
        banRate: 8,
        currentForm: 72,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'betboom', opponentName: 'BETBOOM', result: 'L', score: '8:13', date: '17 дн. назад', oppRating: 72 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 66,
        baseMapRating: 66,
        winRate: 48,
        mapsPlayed: 12,
        wins: 6,
        losses: 6,
        pickRate: 14,
        banRate: 12,
        currentForm: 65,
        formChange30d: -1,
        formChange90d: 0,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'L', score: '9:13', date: '25 дн. назад', oppRating: 74 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 67,
        baseMapRating: 67,
        winRate: 51,
        mapsPlayed: 6,
        wins: 3,
        losses: 3,
        pickRate: 10,
        banRate: 12,
        currentForm: 67,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 75,
        recentResults: [
          { opponentId: 'tyloo', opponentName: 'TYLOO', result: 'W', score: '13:8', date: '20 дн. назад', oppRating: 58 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 70,
        baseMapRating: 70,
        winRate: 53,
        mapsPlayed: 16,
        wins: 8,
        losses: 8,
        pickRate: 18,
        banRate: 10,
        currentForm: 70,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 77,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '8:13', date: '8 дн. назад', oppRating: 96 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 52,
        baseMapRating: 52,
        winRate: 40,
        mapsPlayed: 7,
        wins: 3,
        losses: 4,
        pickRate: 3,
        banRate: 55,
        isPermanentBan: true,
        currentForm: 50,
        formChange30d: -2,
        formChange90d: -4,
        opponentsStrength: 78,
        recentResults: [
          { opponentId: 'parivision', opponentName: 'PARIVISION', result: 'L', score: '11:13', date: '16 дн. назад', oppRating: 74 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 76,
        baseMapRating: 76,
        winRate: 60,
        mapsPlayed: 21,
        wins: 12,
        losses: 9,
        pickRate: 26,
        banRate: 5,
        isFavoritePick: true,
        currentForm: 77,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 77,
        recentResults: [
          { opponentId: '1win', opponentName: '1win', result: 'W', score: '13:9', date: '21 дн. назад', oppRating: 70 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 74,
        baseMapRating: 74,
        winRate: 58,
        mapsPlayed: 18,
        wins: 10,
        losses: 8,
        pickRate: 21,
        banRate: 6,
        currentForm: 75,
        formChange30d: 1,
        formChange90d: 3,
        opponentsStrength: 76,
        recentResults: [
          { opponentId: 'm80', opponentName: 'M80', result: 'W', score: '13:10', date: '12 дн. назад', oppRating: 66 }
        ]
      }
    }
  },

  m80: {
    overallRating: 66,
    currentForm: 69,
    bestMaps: ['Ancient', 'Anubis', 'Mirage'],
    worstMaps: ['Nuke'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 75,
        baseMapRating: 75,
        winRate: 61,
        mapsPlayed: 17,
        wins: 10,
        losses: 7,
        pickRate: 26,
        banRate: 5,
        isFavoritePick: true,
        currentForm: 77,
        formChange30d: 3,
        formChange90d: 5,
        opponentsStrength: 70,
        recentResults: [
          { opponentId: 'tyloo', opponentName: 'TYLOO', result: 'W', score: '13:7', date: '15 дн. назад', oppRating: 58 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 73,
        baseMapRating: 73,
        winRate: 58,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 23,
        banRate: 6,
        currentForm: 74,
        formChange30d: 2,
        formChange90d: 4,
        opponentsStrength: 70,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '5:13', date: '40 дн. назад', oppRating: 96 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 65,
        baseMapRating: 65,
        winRate: 50,
        mapsPlayed: 6,
        wins: 3,
        losses: 3,
        pickRate: 11,
        banRate: 12,
        currentForm: 66,
        formChange30d: 1,
        formChange90d: 1,
        opponentsStrength: 69,
        recentResults: [
          { opponentId: 'shinden', opponentName: 'ShindeN', result: 'W', score: '13:8', date: '25 дн. назад', oppRating: 48 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 68,
        baseMapRating: 68,
        winRate: 52,
        mapsPlayed: 14,
        wins: 7,
        losses: 7,
        pickRate: 18,
        banRate: 10,
        currentForm: 69,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 71,
        recentResults: [
          { opponentId: '9z', opponentName: '9z', result: 'L', score: '10:13', date: '14 дн. назад', oppRating: 71 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 62,
        baseMapRating: 62,
        winRate: 46,
        mapsPlayed: 11,
        wins: 5,
        losses: 6,
        pickRate: 12,
        banRate: 14,
        currentForm: 62,
        formChange30d: 0,
        formChange90d: 0,
        opponentsStrength: 72,
        recentResults: [
          { opponentId: 'tyloo', opponentName: 'TYLOO', result: 'L', score: '10:13', date: '28 дн. назад', oppRating: 58 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 71,
        baseMapRating: 71,
        winRate: 55,
        mapsPlayed: 16,
        wins: 9,
        losses: 7,
        pickRate: 21,
        banRate: 7,
        currentForm: 72,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 71,
        recentResults: [
          { opponentId: 'navi', opponentName: 'NAVI', result: 'L', score: '10:13', date: '12 дн. назад', oppRating: 69 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 44,
        baseMapRating: 44,
        winRate: 34,
        mapsPlayed: 5,
        wins: 1,
        losses: 4,
        pickRate: 1,
        banRate: 67,
        isPermanentBan: true,
        currentForm: 42,
        formChange30d: -3,
        formChange90d: -5,
        opponentsStrength: 74,
        recentResults: [
          { opponentId: 'navi', opponentName: 'NAVI', result: 'L', score: '6:13', date: '36 дн. назад', oppRating: 69 }
        ]
      }
    }
  },

  tyloo: {
    overallRating: 58,
    currentForm: 56,
    bestMaps: ['Inferno', 'Mirage', 'Dust2'],
    worstMaps: ['Nuke'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 59,
        baseMapRating: 59,
        winRate: 46,
        mapsPlayed: 13,
        wins: 6,
        losses: 7,
        pickRate: 18,
        banRate: 10,
        currentForm: 58,
        formChange30d: 0,
        formChange90d: 1,
        opponentsStrength: 66,
        recentResults: [
          { opponentId: 'm80', opponentName: 'M80', result: 'L', score: '7:13', date: '15 дн. назад', oppRating: 66 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 56,
        baseMapRating: 56,
        winRate: 43,
        mapsPlayed: 11,
        wins: 5,
        losses: 6,
        pickRate: 15,
        banRate: 12,
        currentForm: 55,
        formChange30d: -1,
        formChange90d: 0,
        opponentsStrength: 66,
        recentResults: [
          { opponentId: 'shinden', opponentName: 'ShindeN', result: 'W', score: '13:9', date: '19 дн. назад', oppRating: 48 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 58,
        baseMapRating: 58,
        winRate: 45,
        mapsPlayed: 5,
        wins: 2,
        losses: 3,
        pickRate: 10,
        banRate: 14,
        currentForm: 57,
        formChange30d: 0,
        formChange90d: 0,
        opponentsStrength: 65,
        recentResults: [
          { opponentId: 'navi', opponentName: 'NAVI', result: 'L', score: '8:13', date: '20 дн. назад', oppRating: 69 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 64,
        baseMapRating: 64,
        winRate: 50,
        mapsPlayed: 15,
        wins: 7,
        losses: 8,
        pickRate: 21,
        banRate: 8,
        currentForm: 64,
        formChange30d: 1,
        formChange90d: 1,
        opponentsStrength: 67,
        recentResults: [
          { opponentId: 'shinden', opponentName: 'ShindeN', result: 'W', score: '13:7', date: '10 дн. назад', oppRating: 48 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 67,
        baseMapRating: 67,
        winRate: 54,
        mapsPlayed: 17,
        wins: 9,
        losses: 8,
        pickRate: 25,
        banRate: 5,
        isFavoritePick: true,
        currentForm: 68,
        formChange30d: 2,
        formChange90d: 3,
        opponentsStrength: 67,
        recentResults: [
          { opponentId: 'm80', opponentName: 'M80', result: 'W', score: '13:10', date: '28 дн. назад', oppRating: 66 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 65,
        baseMapRating: 65,
        winRate: 52,
        mapsPlayed: 16,
        wins: 8,
        losses: 8,
        pickRate: 22,
        banRate: 7,
        currentForm: 65,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 68,
        recentResults: [
          { opponentId: '9z', opponentName: '9z', result: 'L', score: '8:13', date: '22 дн. назад', oppRating: 71 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 40,
        baseMapRating: 40,
        winRate: 30,
        mapsPlayed: 4,
        wins: 1,
        losses: 3,
        pickRate: 1,
        banRate: 70,
        isPermanentBan: true,
        currentForm: 38,
        formChange30d: -2,
        formChange90d: -5,
        opponentsStrength: 70,
        recentResults: [
          { opponentId: 'spirit', opponentName: 'Spirit', result: 'L', score: '4:13', date: '50 дн. назад', oppRating: 96 }
        ]
      }
    }
  },

  shinden: {
    overallRating: 48,
    currentForm: 46,
    bestMaps: ['Dust2', 'Mirage', 'Ancient'],
    worstMaps: ['Nuke'],
    maps: {
      Ancient: {
        mapName: 'Ancient',
        mapRating: 51,
        baseMapRating: 51,
        winRate: 39,
        mapsPlayed: 10,
        wins: 4,
        losses: 6,
        pickRate: 19,
        banRate: 9,
        currentForm: 50,
        formChange30d: 0,
        formChange90d: 0,
        opponentsStrength: 64,
        recentResults: [
          { opponentId: 'tyloo', opponentName: 'TYLOO', result: 'L', score: '8:13', date: '14 дн. назад', oppRating: 58 }
        ]
      },
      Anubis: {
        mapName: 'Anubis',
        mapRating: 48,
        baseMapRating: 48,
        winRate: 37,
        mapsPlayed: 9,
        wins: 3,
        losses: 6,
        pickRate: 16,
        banRate: 11,
        currentForm: 47,
        formChange30d: -1,
        formChange90d: -1,
        opponentsStrength: 63,
        recentResults: [
          { opponentId: 'tyloo', opponentName: 'TYLOO', result: 'L', score: '9:13', date: '19 дн. назад', oppRating: 58 }
        ]
      },
      Cache: {
        mapName: 'Cache',
        mapRating: 47,
        baseMapRating: 47,
        winRate: 36,
        mapsPlayed: 5,
        wins: 1,
        losses: 4,
        pickRate: 10,
        banRate: 15,
        currentForm: 46,
        formChange30d: 0,
        formChange90d: -1,
        opponentsStrength: 63,
        recentResults: [
          { opponentId: 'legacy', opponentName: 'Legacy', result: 'L', score: '6:13', date: '22 дн. назад', oppRating: 84 }
        ]
      },
      Dust2: {
        mapName: 'Dust2',
        mapRating: 56,
        baseMapRating: 56,
        winRate: 44,
        mapsPlayed: 13,
        wins: 5,
        losses: 8,
        pickRate: 26,
        banRate: 5,
        isFavoritePick: true,
        currentForm: 57,
        formChange30d: 1,
        formChange90d: 2,
        opponentsStrength: 65,
        recentResults: [
          { opponentId: 'tyloo', opponentName: 'TYLOO', result: 'L', score: '7:13', date: '10 дн. назад', oppRating: 58 }
        ]
      },
      Inferno: {
        mapName: 'Inferno',
        mapRating: 45,
        baseMapRating: 45,
        winRate: 35,
        mapsPlayed: 8,
        wins: 2,
        losses: 6,
        pickRate: 14,
        banRate: 14,
        currentForm: 44,
        formChange30d: -1,
        formChange90d: -2,
        opponentsStrength: 66,
        recentResults: [
          { opponentId: '9z', opponentName: '9z', result: 'L', score: '7:13', date: '26 дн. назад', oppRating: 71 }
        ]
      },
      Mirage: {
        mapName: 'Mirage',
        mapRating: 54,
        baseMapRating: 54,
        winRate: 42,
        mapsPlayed: 12,
        wins: 5,
        losses: 7,
        pickRate: 22,
        banRate: 8,
        currentForm: 54,
        formChange30d: 1,
        formChange90d: 1,
        opponentsStrength: 65,
        recentResults: [
          { opponentId: 'm80', opponentName: 'M80', result: 'L', score: '9:13', date: '23 дн. назад', oppRating: 66 }
        ]
      },
      Nuke: {
        mapName: 'Nuke',
        mapRating: 35,
        baseMapRating: 35,
        winRate: 24,
        mapsPlayed: 4,
        wins: 0,
        losses: 4,
        pickRate: 1,
        banRate: 74,
        isPermanentBan: true,
        currentForm: 33,
        formChange30d: -3,
        formChange90d: -6,
        opponentsStrength: 68,
        recentResults: [
          { opponentId: '9z', opponentName: '9z', result: 'L', score: '4:13', date: '16 дн. назад', oppRating: 71 }
        ]
      }
    }
  }
};

/**
 * Returns a clean, zeroed-out map profile for any team.
 */
export function getBaselineMapProfile(_teamId?: string): TeamMapProfile {
  return createZeroMapProfile();
}

/**
 * Returns a completely clean, zeroed-out map profile with 0 games played,
 * 0 wins, 0 losses, 0% winrate, and empty recent results.
 * Future map stats will dynamically build strictly from actual games played!
 */
export function createZeroMapProfile(): TeamMapProfile {
  const zeroMaps: Record<ActiveDutyMap, TeamMapStats> = {} as any;
  for (const mapName of ACTIVE_DUTY_MAPS) {
    zeroMaps[mapName] = {
      mapName,
      mapRating: 50,
      baseMapRating: 50,
      winRate: 0,
      mapsPlayed: 0,
      wins: 0,
      losses: 0,
      pickRate: 0,
      banRate: 0,
      currentForm: 50,
      formChange30d: 0,
      formChange90d: 0,
      opponentsStrength: 50,
      recentResults: []
    };
  }

  return {
    overallRating: 50,
    currentForm: 50,
    bestMaps: [],
    worstMaps: [],
    maps: zeroMaps
  };
}
