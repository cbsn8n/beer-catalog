async function main() {
  console.log("Postgres import scaffold is prepared but temporarily disabled in production build.");
  console.log("Run this script later from a dedicated job/container with Prisma runtime configured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
