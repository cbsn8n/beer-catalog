import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSyncButton } from "@/components/admin-sync-button";
import { BeeradmLoginForm } from "@/components/beeradm-login-form";
import { BeeradmLogoutButton } from "@/components/beeradm-logout-button";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function BeeradmPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const authorized = verifyAdminSessionToken(token);

  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
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

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Синхронизация каталога</h2>
                      <p className="text-sm text-gray-600">
                        Запуск ручного sync из NocoDB в локальные данные сайта.
                      </p>
                    </div>
                    <AdminSyncButton />
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

