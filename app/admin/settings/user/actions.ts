"use server";

import { Prisma, type UserRole } from "@/generated/prisma/client";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roles";

const userRoleValues = ["ADMIN", "STAFF", "OFFICER"] as const;

const updateUserSchema = z
  .object({
    userId: z.string().min(1),
    role: z.enum(userRoleValues),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
    password: z.preprocess(
      (v) => {
        const trimmed = String(v ?? "").trim();
        return trimmed === "" ? undefined : trimmed;
      },
      z.string().min(6).max(200).optional(),
    ),
    confirmPassword: z.preprocess(
      (v) => {
        const trimmed = String(v ?? "").trim();
        return trimmed === "" ? undefined : trimmed;
      },
      z.string().min(6).max(200).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    const { password, confirmPassword } = data;
    if (!password && !confirmPassword) return;
    if (password && !confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Konfirmasi password wajib diisi",
        path: ["confirmPassword"],
      });
      return;
    }
    if (!password && confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Isi password terlebih dahulu",
        path: ["password"],
      });
      return;
    }
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Konfirmasi password tidak cocok",
        path: ["confirmPassword"],
      });
    }
  });

const createUserSchema = z
  .object({
    name: z.string().max(200).optional(),
    email: z.string().email(),
    password: z.string().min(6).max(200),
    confirmPassword: z.string().min(6).max(200),
    role: z.enum(userRoleValues),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export async function createUser(formData: FormData) {
  await requireAdmin();
  const parseResult = createUserSchema.safeParse({
    name: String(formData.get("name") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    role: String(formData.get("role") ?? ""),
    isActive: String(formData.get("isActive") ?? "true"),
  });
  if (!parseResult.success) {
    const first = parseResult.error.issues[0];
    throw new Error(first?.message ?? "Invalid form data");
  }
  const parsed = parseResult.data;

  const passwordHash = await hash(parsed.password, 10);

  try {
    await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role: parsed.role as UserRole,
        isActive: parsed.isActive,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Alamat email sudah terdaftar");
    }

    // Fallback untuk runtime Prisma client stale (mis. "Unknown argument `role`").
    const message = e instanceof Error ? e.message : "";
    if (
      e instanceof Prisma.PrismaClientValidationError &&
      message.includes("Unknown argument `role`")
    ) {
      try {
        await prisma.$executeRaw(
          Prisma.sql`INSERT INTO \`User\` (\`id\`, \`name\`, \`email\`, \`passwordHash\`, \`role\`, \`isActive\`, \`createdAt\`, \`updatedAt\`)
                     VALUES (${randomUUID()}, ${parsed.name ?? null}, ${parsed.email}, ${passwordHash}, ${parsed.role}, ${parsed.isActive}, NOW(), NOW())`,
        );
      } catch (rawErr) {
        const rawMessage = rawErr instanceof Error ? rawErr.message : "";
        if (rawMessage.toLowerCase().includes("duplicate") || rawMessage.toLowerCase().includes("unique")) {
          throw new Error("Alamat email sudah terdaftar");
        }
        throw rawErr;
      }
    } else {
      throw e;
    }
  }
  revalidatePath("/admin/settings/user");
}

export async function updateUserFields(formData: FormData) {
  await requireAdmin();
  const parseResult = updateUserSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? ""),
    isActive: String(formData.get("isActive") ?? "true"),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parseResult.success) {
    const first = parseResult.error.issues[0];
    throw new Error(first?.message ?? "Invalid form data");
  }
  const parsed = parseResult.data;

  const data: {
    role: UserRole;
    isActive: boolean;
    passwordHash?: string;
  } = {
    role: parsed.role as UserRole,
    isActive: parsed.isActive,
  };

  if (parsed.password) {
    data.passwordHash = await hash(parsed.password, 10);
  }

  await prisma.user.update({
    where: { id: parsed.userId },
    data,
  });
  revalidatePath("/admin/settings/user");
}

export async function resetUserTotp(userId: string) {
  await requireAdmin();
  if (!userId) {
    throw new Error("Missing user");
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id === userId) {
    throw new Error("You cannot reset your own 2FA from this page");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: null,
      totpEnabled: false,
    },
  });
  revalidatePath("/admin/settings/user");
}

/** Hapus user tanpa dokumen; jika punya dokumen, cukup nonaktifkan (isActive = false). */
export async function deleteUser(userId: string) {
  await requireAdmin();
  if (!userId) {
    throw new Error("Missing user");
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id === userId) {
    throw new Error("You cannot remove your own account");
  }

  const [inv, po, sj, sph] = await Promise.all([
    prisma.invoice.count({ where: { createdById: userId } }),
    prisma.purchaseOrder.count({ where: { createdById: userId } }),
    prisma.suratJalan.count({ where: { createdById: userId } }),
    prisma.sph.count({ where: { createdById: userId } }),
  ]);
  const hasDocuments = inv + po + sj + sph > 0;

  if (hasDocuments) {
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  } else {
    await prisma.user.delete({ where: { id: userId } });
  }
  revalidatePath("/admin/settings/user");
}
