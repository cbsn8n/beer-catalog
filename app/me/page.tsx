import { cookies } from "next/headers";
import { Lock } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LoginModalTriggerButton } from "@/components/login-modal-trigger-button";
import { UserAccountClient } from "@/components/user-account-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserView } from "@/lib/user-base";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const cookieStore = await cookies();
  const user = getUserView(verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value));

  return (
    <>
      <Header initialUser={user} showCatalogSwitch={false} />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Card className="rounded-2xl border bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Личный кабинет</CardTitle>
              <CardDescription>
                Профиль пользователя, оформление моей базы и уровень влияния на общий рейтинг.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Lock className="h-4 w-4" />
                      Личный кабинет доступен только авторизованным пользователям.
                    </span>
                  </div>
                  <LoginModalTriggerButton size="lg">Войти через Telegram</LoginModalTriggerButton>
                </div>
              ) : (
                <UserAccountClient initialUser={user} />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}
