import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@transdigital.id";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const passwordHash = await hash(adminPassword, 10);

  await prisma.companyProfile.upsert({
    where: { id: "default-company-profile" },
    update: {},
    create: {
      id: "default-company-profile",
      companyName: "PT. TRANSFORMASI DIGITAL ABADI",
      address:
        "Ruko Acropolis Blok C9 No. 10, Legenda Wisata Nagrak, Gunung Putri, Bogor, Jawa Barat",
      phone: "+62 812-8458-2835",
      email: "contact@transdigital.id",
      website: "https://www.transdigital.id",
      taxId: "10.000.000.2-017.970",
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: "Admin TDA",
    },
    create: {
      email: adminEmail,
      name: "Admin TDA",
      role: "ADMIN",
      passwordHash,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
