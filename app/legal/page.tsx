import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Правовая информация — Beervana",
};

export default function LegalPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Правовая информация</h1>

            <div className="space-y-4 text-sm leading-7 text-gray-700">
              <p>
                Материалы сайта предоставлены исключительно для ознакомления и личного использования.
                Информация не является публичной офертой, юридической, медицинской или иной консультацией.
              </p>
              <p>
                Администрация сайта не несет ответственности за любые прямые или косвенные убытки,
                возникшие в результате использования или невозможности использования сайта,
                а также за действия третьих лиц и внешних сервисов.
              </p>
              <p>
                На сайте могут использоваться сторонние инструменты аналитики и авторизации.
                Продолжая использование сайта, вы подтверждаете согласие с этой практикой.
              </p>
              <p>
                В случае претензий, замечаний или предложений свяжитесь с нами по электронной почте:
                <a className="ml-1 font-medium text-amber-700 hover:underline" href="mailto:support@vana.beer">
                  support@vana.beer
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
