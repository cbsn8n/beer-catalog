import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSyncButton } from "@/components/admin-sync-button";
import { BeeradmLoginForm } from "@/components/beeradm-login-form";
import { BeeradmLogoutButton } from "@/components/beeradm-logout-button";
import { BeeradmModerationActions } from "@/components/beeradm-moderation-actions";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getBeeradmOverview, type ModerationSubmission } from "@/lib/beeradm";

export const dynamic = "force-dynamic";

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

function renderSubmissionSummary(item: ModerationSubmission) {
  if (item.payload.kind === "new-beer") {
    return `Новое пиво: ${item.payload.name}`;
  }

  const parts: string[] = [`Обновление карточки #${item.payload.beerId}`];
  if (item.payload.rating != null) parts.push(`оценка ${item.payload.rating}`);
  if (item.payload.comment) parts.push("комментарий");
  if (item.payload.imageRemote) parts.push("фото");
  return parts.join(" • ");
}

export default async function BeeradmPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const authorized = verifyAdminSessionToken(token);
  const overview = authorized ? getBeeradmOverview() : null;

  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Card className="rounded-2xl border bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
                beeradm
              </CardTitle>
              <CardDescription>
                Закрытая панель администрирования Beervana.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {!authorized ? (
                <BeeradmLoginForm />
              ) : (
                <>
                  <div className="rounded-lg border bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Авторизация успешна. Доступ к админ-функциям активен.
                  </div>

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
                        {overview?.lastSync?.status === "success" ? "Успешно" : overview?.lastSync?.status === "error" ? "Ошибка" : "Нет данных"}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{formatDate(overview?.lastSync?.finishedAt)}</div>
                    </div>
                    <div className="rounded-xl border bg-white p-3 sm:col-span-2 lg:col-span-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Заявок на модерацию</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900">{overview?.moderationPendingCount ?? 0}</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Модерация заявок</h3>

                    {overview?.moderationPending?.length ? (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="px-3 py-2 text-left">Время</th>
                              <th className="px-3 py-2 text-left">Пользователь</th>
                              <th className="px-3 py-2 text-left">Заявка</th>
                              <th className="px-3 py-2 text-right">Действие</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overview.moderationPending.map((item) => (
                              <tr key={item.id} className="border-t bg-white align-top">
                                <td className="px-3 py-2 text-gray-700">{formatDate(item.createdAt)}</td>
                                <td className="px-3 py-2 text-gray-700">
                                  {item.user.first_name}
                                  {item.user.username ? ` (@${item.user.username})` : ""}
                                </td>
                                <td className="px-3 py-2 text-gray-700">{renderSubmissionSummary(item)}</td>
                                <td className="px-3 py-2 text-right">
                                  <BeeradmModerationActions submissionId={item.id} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">
                        Новых заявок на модерацию нет.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Синхронизация каталога</h2>
                      <p className="text-sm text-gray-600">
                        Запуск ручного sync из NocoDB в локальные данные сайта.
                      </p>
                    </div>
                    <AdminSyncButton />
                  </div>

                  <div className="space-y-2 border-t pt-4">
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
                                <td className="px-3 py-2 text-right text-gray-700">
                                  +{item.images.downloaded} / ={item.images.skipped} / !{item.images.failed}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-700">{formatDuration(item.durationMs)}</td>
                                <td className="px-3 py-2 text-gray-700">{item.trigger}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">
                        История пока пустая.
                      </div>
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
                                <td className="px-3 py-2 text-gray-600">
                                  {entry.details ? JSON.stringify(entry.details) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">
                        Журнал пока пустой.
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <BeeradmLogoutButton />
                  </div>
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
