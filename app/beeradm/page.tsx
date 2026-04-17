import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSyncButton } from "@/components/admin-sync-button";
import { BeeradmImageTools } from "@/components/beeradm-image-tools";
import { BeeradmLoginForm } from "@/components/beeradm-login-form";
import { BeeradmLogoutButton } from "@/components/beeradm-logout-button";
import { BeeradmModerationActions } from "@/components/beeradm-moderation-actions";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { formatBeerPriceApprox } from "@/lib/price-display";
import { getBeeradmOverview, type ModerationSubmission } from "@/lib/beeradm";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "home", label: "Главная" },
  { key: "moderation", label: "Модерация" },
  { key: "base", label: "База" },
  { key: "logs", label: "Логи" },
  { key: "settings", label: "Настройки" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "medium" });
}

function formatDuration(ms: number | null | undefined) {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function getActiveTab(input?: string): TabKey {
  const found = TABS.find((tab) => tab.key === input);
  return found?.key || "home";
}

function kindLabel(item: ModerationSubmission) {
  return item.payload.kind === "new-beer" ? "Новая карточка" : "Обновление карточки";
}

function renderModerationPayload(item: ModerationSubmission) {
  if (item.payload.kind === "new-beer") {
    return (
      <div className="space-y-2 text-sm text-gray-700">
        <div><span className="font-medium">Название:</span> {item.payload.name}</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div><span className="font-medium">Страна:</span> {item.payload.country || "—"}</div>
          <div><span className="font-medium">Тип:</span> {item.payload.type || "—"}</div>
          <div><span className="font-medium">Сорт:</span> {item.payload.sort || "—"}</div>
          <div><span className="font-medium">Фильтрация:</span> {item.payload.filtration || "—"}</div>
          <div>
            <span className="font-medium">Цена:</span>{" "}
            {item.payload.price != null ? formatBeerPriceApprox(item.payload.price) : "—"}
          </div>
          <div><span className="font-medium">Оценка:</span> {item.payload.rating ?? "—"}</div>
        </div>

        <div>
          <span className="font-medium">Комментарий:</span>
          <div className="mt-1 whitespace-pre-wrap rounded-md border bg-white px-2 py-1 text-gray-700">
            {item.payload.comment || "—"}
          </div>
        </div>

        <div className="grid gap-1">
          <div>
            <span className="font-medium">Локальное фото:</span>{" "}
            {item.payload.imageLocal ? (
              <a className="text-amber-700 underline" href={item.payload.imageLocal} target="_blank" rel="noreferrer">
                {item.payload.imageLocal}
              </a>
            ) : "—"}
          </div>
          <div>
            <span className="font-medium">Удалённое фото:</span>{" "}
            {item.payload.imageRemote ? (
              <a className="text-amber-700 underline" href={item.payload.imageRemote} target="_blank" rel="noreferrer">
                открыть
              </a>
            ) : "—"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm text-gray-700">
      <div><span className="font-medium">Карточка:</span> #{item.payload.beerId}</div>
      <div><span className="font-medium">Оценка:</span> {item.payload.rating ?? "—"}</div>
      <div>
        <span className="font-medium">Комментарий:</span>
        <div className="mt-1 whitespace-pre-wrap rounded-md border bg-white px-2 py-1 text-gray-700">
          {item.payload.comment || "—"}
        </div>
      </div>
      <div className="grid gap-1">
        <div>
          <span className="font-medium">Локальное фото:</span>{" "}
          {item.payload.imageLocal ? (
            <a className="text-amber-700 underline" href={item.payload.imageLocal} target="_blank" rel="noreferrer">
              {item.payload.imageLocal}
            </a>
          ) : "—"}
        </div>
        <div>
          <span className="font-medium">Удалённое фото:</span>{" "}
          {item.payload.imageRemote ? (
            <a className="text-amber-700 underline" href={item.payload.imageRemote} target="_blank" rel="noreferrer">
              открыть
            </a>
          ) : "—"}
        </div>
      </div>
    </div>
  );
}

export default async function BeeradmPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const authorized = verifyAdminSessionToken(token);
  const overview = authorized ? getBeeradmOverview() : null;

  const params = searchParams ? await searchParams : undefined;
  const tabRaw = Array.isArray(params?.tab) ? params?.tab[0] : params?.tab;
  const activeTab = getActiveTab(tabRaw);

  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Card className="rounded-2xl border bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
                beeradm
              </CardTitle>
              <CardDescription>Закрытая панель администрирования Beervana.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {!authorized ? (
                <BeeradmLoginForm />
              ) : (
                <>
                  <div className="rounded-lg border bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Авторизация успешна. Доступ к админ-функциям активен.
                  </div>

                  <div className="flex flex-wrap gap-2 border-b pb-3">
                    {TABS.map((tab) => {
                      const active = tab.key === activeTab;
                      return (
                        <Link
                          key={tab.key}
                          href={`/beeradm?tab=${tab.key}`}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            active
                              ? "border-amber-500 bg-amber-100 text-amber-900"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {tab.label}
                        </Link>
                      );
                    })}
                  </div>

                  {activeTab === "home" && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Пиво в каталоге</div>
                        <div className="mt-1 text-2xl font-bold text-gray-900">{overview?.beersCount ?? 0}</div>
                      </div>
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Локальных фото</div>
                        <div className="mt-1 text-2xl font-bold text-gray-900">{overview?.imagesCount ?? 0}</div>
                      </div>
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Thumbnails</div>
                        <div className="mt-1 text-2xl font-bold text-gray-900">{overview?.thumbsCount ?? 0}</div>
                      </div>
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Последний sync</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {overview?.lastSync?.status === "success"
                            ? "Успешно"
                            : overview?.lastSync?.status === "error"
                              ? "Ошибка"
                              : "Нет данных"}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">{formatDate(overview?.lastSync?.finishedAt)}</div>
                      </div>
                      <div className="rounded-xl border bg-white p-3 sm:col-span-2 lg:col-span-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Ожидают модерацию</div>
                        <div className="mt-1 text-2xl font-bold text-gray-900">{overview?.moderationPendingCount ?? 0}</div>
                      </div>
                    </div>
                  )}

                  {activeTab === "moderation" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Заявки на модерацию</h3>

                      {overview?.moderationPending?.length ? (
                        <div className="space-y-3">
                          {overview.moderationPending.map((item) => (
                            <div key={item.id} className="rounded-xl border bg-white p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                <div className="text-sm text-gray-800">
                                  <span className="font-semibold">{kindLabel(item)}</span> • {formatDate(item.createdAt)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {item.user.first_name}
                                  {item.user.username ? ` (@${item.user.username})` : ""}
                                </div>
                              </div>

                              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                                {renderModerationPayload(item)}
                                <div className="lg:min-w-[150px]">
                                  <BeeradmModerationActions submissionId={item.id} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">
                          Новых заявок на модерацию нет.
                        </div>
                      )}

                      <div className="border-t pt-4">
                        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Недавно обработанные</h4>
                        {overview?.moderationRecent?.length ? (
                          <div className="overflow-x-auto rounded-xl border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                  <th className="px-3 py-2 text-left">Время</th>
                                  <th className="px-3 py-2 text-left">Пользователь</th>
                                  <th className="px-3 py-2 text-left">Тип</th>
                                  <th className="px-3 py-2 text-left">Статус</th>
                                  <th className="px-3 py-2 text-left">Комментарий</th>
                                </tr>
                              </thead>
                              <tbody>
                                {overview.moderationRecent.filter((x) => x.status !== "pending").slice(0, 30).map((item) => (
                                  <tr key={item.id} className="border-t bg-white">
                                    <td className="px-3 py-2 text-gray-700">{formatDate(item.reviewedAt || item.createdAt)}</td>
                                    <td className="px-3 py-2 text-gray-700">
                                      {item.user.first_name}
                                      {item.user.username ? ` (@${item.user.username})` : ""}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{kindLabel(item)}</td>
                                    <td className={`px-3 py-2 font-medium ${item.status === "approved" ? "text-emerald-700" : "text-red-600"}`}>
                                      {item.status}
                                    </td>
                                    <td className="px-3 py-2 whitespace-pre-wrap text-gray-700">
                                      {item.note || (item.payload.kind === "beer-update" ? item.payload.comment : item.payload.comment) || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">История модерации пока пустая.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "base" && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Синхронизация каталога</h3>
                          <p className="text-sm text-gray-600">Ручной sync из NocoDB в локальную базу сайта.</p>
                        </div>
                        <AdminSyncButton />
                      </div>

                      <div className="space-y-2 border-t pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Карточки и фото (админ)</h3>
                        <p className="text-sm text-gray-600">Поворот фото по одной карточке и массово для выбранных карточек.</p>
                        <BeeradmImageTools />
                      </div>
                    </div>
                  )}

                  {activeTab === "logs" && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">История синков</h3>
                        {overview?.syncHistory?.length ? (
                          <div className="overflow-x-auto rounded-xl border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                  <th className="px-3 py-2 text-left">Время</th>
                                  <th className="px-3 py-2 text-left">Статус</th>
                                  <th className="px-3 py-2 text-right">Пиво</th>
                                  <th className="px-3 py-2 text-right">Фото</th>
                                  <th className="px-3 py-2 text-right">Длительность</th>
                                  <th className="px-3 py-2 text-left">Источник</th>
                                </tr>
                              </thead>
                              <tbody>
                                {overview.syncHistory.map((item) => (
                                  <tr key={item.id} className="border-t bg-white">
                                    <td className="px-3 py-2 text-gray-700">{formatDate(item.finishedAt)}</td>
                                    <td className={`px-3 py-2 font-medium ${item.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
                                      {item.status === "success" ? "ok" : "error"}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-700">{item.beers}</td>
                                    <td className="px-3 py-2 text-right text-gray-700">+{item.images.downloaded} / ={item.images.skipped} / !{item.images.failed}</td>
                                    <td className="px-3 py-2 text-right text-gray-700">{formatDuration(item.durationMs)}</td>
                                    <td className="px-3 py-2 text-gray-700">{item.trigger}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">История пока пустая.</div>
                        )}
                      </div>

                      <div className="space-y-2 border-t pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Журнал действий</h3>
                        {overview?.audit?.length ? (
                          <div className="overflow-x-auto rounded-xl border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                  <th className="px-3 py-2 text-left">Время</th>
                                  <th className="px-3 py-2 text-left">Событие</th>
                                  <th className="px-3 py-2 text-left">Детали</th>
                                </tr>
                              </thead>
                              <tbody>
                                {overview.audit.map((entry, idx) => (
                                  <tr key={`${entry.at}-${idx}`} className="border-t bg-white">
                                    <td className="px-3 py-2 text-gray-700">{formatDate(entry.at)}</td>
                                    <td className="px-3 py-2 font-medium text-gray-900">{entry.action}</td>
                                    <td className="px-3 py-2 text-gray-600">{entry.details ? JSON.stringify(entry.details) : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">Журнал пока пустой.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "settings" && (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-700">
                        Раздел настроек. Здесь собраны базовые действия админа и служебные параметры сессии.
                      </div>
                      <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-700">
                        Текущий хост: <span className="font-mono">vana.beer</span>
                      </div>
                      <div className="border-t pt-4">
                        <BeeradmLogoutButton />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}
