import type { UserSession } from "@/lib/user-auth";

export interface UserLevelInfo {
  level: number;
  weight: number;
  badgeLabel: string;
  title: string;
  thresholdLabel: string;
}

export interface UserView extends UserSession {
  avatarUrl: string | null;
  customAvatarUrl: string | null;
  heroImageUrl: string | null;
  interactionCount: number;
  ratingLevel: number;
  ratingWeight: number;
  ratingBadgeLabel: string;
  ratingLevelTitle: string;
}

export const USER_LEVELS: UserLevelInfo[] = [
  { level: 1, weight: 1, badgeLabel: "🍺 Новичок", title: "Первый уровень", thresholdLabel: "до 10 сортов" },
  { level: 2, weight: 2, badgeLabel: "🍻 Исследователь", title: "Второй уровень", thresholdLabel: "до 100 сортов" },
  { level: 3, weight: 3, badgeLabel: "🏅 Дегустатор", title: "Третий уровень", thresholdLabel: "до 500 сортов" },
  { level: 4, weight: 4, badgeLabel: "🏆 Пивной гид", title: "Четвёртый уровень", thresholdLabel: "до 1000 сортов" },
  { level: 5, weight: 5, badgeLabel: "👑 Легенда хмеля", title: "Пятый уровень", thresholdLabel: "более 1000 сортов" },
];
