import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Lock } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AddBeerForm } from "@/components/add-beer-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function AddBeerPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;
  const user = verifyUserSessionToken(token);

  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4 gap-2 pl-0">
              <ArrowLeft className="h-4 w-4" />
              Назад к каталогу
            </Button>
          </Link>

          <Card className="rounded-2xl border bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Добавить пиво</CardTitle>
              <CardDescription>
                Новая запись попадёт в каталог и будет доступна всем пользователям.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!user ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Lock className="h-4 w-4" />
                      Форма доступна только авторизованным пользователям.
                    </span>
                  </div>
                  <Link href="/login">
                    <Button size="lg">Войти через Telegram</Button>
                  </Link>
                </div>
              ) : (
                <AddBeerForm />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}

