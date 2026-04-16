import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Политика конфиденциальности — Beervana",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Политика конфиденциальности</h1>

            <div className="space-y-4 text-sm leading-7 text-gray-700">
              <p>
                Данный сайт носит информационный характер. Используя сайт, вы соглашаетесь с настоящей
                политикой конфиденциальности.
              </p>
              <p>
                Мы можем обрабатывать технические данные: IP-адрес, cookie, сведения о браузере и устройстве,
                а также действия на страницах сайта для аналитики и улучшения сервиса.
              </p>
              <p>
                Авторизация через Telegram используется только для идентификации пользователя на сайте.
                Мы не запрашиваем пароль Telegram и не получаем доступ к переписке.
              </p>
              <p>
                Вся информация на сайте публикуется «как есть», исключительно для ознакомления.
                Администрация не гарантирует абсолютную точность, полноту и актуальность данных.
              </p>
              <p>
                Если у вас есть вопросы или претензии, напишите на почту:
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
