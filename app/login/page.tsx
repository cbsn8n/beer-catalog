import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TelegramLoginWidget } from "@/components/telegram-login-widget";

export const dynamic = "force-dynamic";

function getAuthUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && /^https?:\/\//.test(siteUrl)) {
    return `${siteUrl.replace(/\/$/, "")}/auth/telegram/callback`;
  }
  return "/auth/telegram/callback";
}

function mapError(error?: string) {
  switch (error) {
    case "telegram-not-configured":
      return "Telegram auth не настроен: проверь TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_USERNAME.";
    case "invalid-hash":
      return "Ошибка проверки Telegram подписи. Повторите вход.";
    case "stale-auth-date":
      return "Ссылка входа устарела. Повторите вход.";
    case "invalid-user":
      return "Некорректные данные пользователя.";
    default:
      return "Не удалось выполнить вход. Попробуйте снова.";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorParam ? mapError(errorParam) : null;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "";
  const authUrl = getAuthUrl();

  return (
    <>
      <Header showCatalogSwitch={false} />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-xl px-4 py-10 sm:px-6">
          <Card className="rounded-2xl border bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Вход</CardTitle>
              <CardDescription>
                Авторизация пользователей через Telegram.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!botUsername ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  TELEGRAM_BOT_USERNAME не задан. Вход временно недоступен.
                </div>
              ) : (
                <div className="flex justify-center">
                  <TelegramLoginWidget botUsername={botUsername} authUrl={authUrl} />
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}

