"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER_LEVELS, type UserView } from "@/lib/user-view";

type Props = {
  initialUser: UserView;
};

export function UserAccountClient({ initialUser }: Props) {
  const [user, setUser] = useState<UserView>(initialUser);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (user.username) return `@${user.username}`;
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!avatarFile && !heroFile) return;

    setLoading(true);
    setError(null);
    setOk(null);

    try {
      const formData = new FormData();
      if (avatarFile) formData.set("avatarFile", avatarFile);
      if (heroFile) formData.set("heroFile", heroFile);

      const res = await fetch("/api/user/profile", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      if (data?.user) {
        setUser(data.user as UserView);
      }

      setAvatarFile(null);
      setHeroFile(null);
      setOk("Профиль обновлён.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={displayName} className="h-28 w-28 rounded-full border border-amber-200 object-cover shadow-sm" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-3xl font-bold text-amber-700 shadow-sm">
                {(user.first_name || "U").slice(0, 1).toUpperCase()}
              </div>
            )}

            <h1 className="mt-4 text-2xl font-bold text-gray-900">{user.first_name}</h1>
            <div className="mt-1 text-sm text-gray-500">{displayName}</div>
            <div className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
              {user.ratingBadgeLabel} · сила оценки x{user.ratingWeight}
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Взаимодействий с пивом: <span className="font-semibold text-gray-900">{user.interactionCount}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Оформление моей базы</h2>
            <p className="mt-1 text-sm text-gray-600">
              Здесь можно загрузить свой аватар и фоновую картинку для hero в режиме «Моя база».
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Свой аватар</label>
                <Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="h-10" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Фон «Моей базы»</label>
                <Input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} className="h-10" />
              </div>
            </div>

            {user.heroImageUrl && (
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Текущий фон</div>
                <div className="overflow-hidden rounded-2xl border bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user.heroImageUrl} alt="Фон моей базы" className="h-48 w-full object-cover" />
                </div>
              </div>
            )}

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

            <Button type="submit" disabled={loading || (!avatarFile && !heroFile)} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Сохранить оформление
            </Button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Уровни силы оценки</h2>
        <p className="mt-1 text-sm text-gray-600">
          Чем больше пива ты добавил, оценил или прокомментировал, тем сильнее твои оценки влияют на общий рейтинг.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {USER_LEVELS.map((level) => {
            const active = user.ratingLevel >= level.level;
            const current = user.ratingLevel === level.level;

            return (
              <div
                key={level.level}
                className={`rounded-2xl border p-4 transition ${
                  current
                    ? "border-amber-500 bg-amber-50 text-amber-950"
                    : active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                <div className="text-sm font-semibold">{level.badgeLabel}</div>
                <div className="mt-1 text-xs uppercase tracking-wide opacity-70">{level.title}</div>
                <div className="mt-3 text-xl font-bold">x{level.weight}</div>
                <div className="mt-1 text-sm">{level.thresholdLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
