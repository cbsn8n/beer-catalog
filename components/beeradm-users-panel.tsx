import Link from "next/link";
import { formatBeerRating } from "@/lib/rating-display";
import type { AdminUserSummary } from "@/lib/user-base";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

export function BeeradmUsersPanel({ users }: { users: AdminUserSummary[] }) {
  if (!users.length) {
    return (
      <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">
        Пока нет сохранённых пользователей.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const displayName = user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ");

        return (
          <details key={user.userId} className="rounded-2xl border bg-white p-4 shadow-sm">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={displayName} className="h-12 w-12 rounded-full border object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-amber-50 font-bold text-amber-700">
                      {(user.firstName || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="text-base font-semibold text-gray-900">{user.firstName}</div>
                    <div className="text-sm text-gray-500">{displayName}</div>
                    <div className="mt-1 text-xs font-medium text-amber-700">
                      {user.ratingBadgeLabel} · сила x{user.ratingWeight}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="rounded-full border bg-gray-50 px-3 py-1">Пиво в базе: {user.beersCount}</span>
                  <span className="rounded-full border bg-gray-50 px-3 py-1">Комментариев: {user.commentsCount}</span>
                  <span className="rounded-full border bg-gray-50 px-3 py-1">Взаимодействий: {user.interactionCount}</span>
                </div>
              </div>
            </summary>

            <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="space-y-3 rounded-xl border bg-amber-50 p-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Пользователь</div>
                  <div className="mt-1 font-semibold text-gray-900">{user.firstName} {user.lastName || ""}</div>
                  <div className="text-sm text-gray-600">{displayName}</div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Ачивка</div>
                  <div className="mt-1 text-sm font-medium text-amber-900">{user.ratingBadgeLabel}</div>
                </div>

                {user.heroImageUrl ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Фон моей базы</div>
                    <div className="overflow-hidden rounded-xl border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={user.heroImageUrl} alt="Фон пользователя" className="h-40 w-full object-cover" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <details className="rounded-xl border bg-gray-50 p-4" open>
                  <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                    База пользователя ({user.beersCount})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {user.beers.length ? user.beers.map((beer) => (
                      <div key={`${user.userId}-${beer.beerId}`} className="rounded-lg border bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/beer/${beer.beerId}`} className="font-medium text-amber-700 underline">
                            {beer.beerName}
                          </Link>
                          <div className="text-xs text-gray-500">{formatDate(beer.updatedAt)}</div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-600">
                          <span>id: #{beer.beerId}</span>
                          <span>оценка: {formatBeerRating(beer.rating)}</span>
                          {beer.addedByUser ? <span>добавлено пользователем</span> : null}
                        </div>
                      </div>
                    )) : <div className="text-sm text-gray-500">База пока пустая.</div>}
                  </div>
                </details>

                <details className="rounded-xl border bg-gray-50 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                    Комментарии пользователя ({user.commentsCount})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {user.comments.length ? user.comments.map((comment) => (
                      <div key={`${user.userId}-${comment.beerId}-${comment.updatedAt}`} className="rounded-lg border bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/beer/${comment.beerId}`} className="font-medium text-amber-700 underline">
                            {comment.beerName}
                          </Link>
                          <div className="text-xs text-gray-500">{formatDate(comment.updatedAt)}</div>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-gray-700">{comment.comment}</div>
                      </div>
                    )) : <div className="text-sm text-gray-500">Комментариев пока нет.</div>}
                  </div>
                </details>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
