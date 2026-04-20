import { cookies } from "next/headers";
import { HomePageClient } from "@/components/home-page-client";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getUserView } from "@/lib/user-base";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const isAdmin = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  const initialUser = getUserView(verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value));

  return <HomePageClient initialIsAdmin={isAdmin} initialUser={initialUser} />;
}
