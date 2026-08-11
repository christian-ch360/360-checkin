import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function listFolders(organizationId: string, agencyId: string, parentFolderId: string | null) {
  return prisma.folder.findMany({
    where: { organizationId, agencyId, parentFolderId },
    orderBy: { name: "asc" },
  });
}

export async function listFilesInFolder(organizationId: string, agencyId: string, folderId: string | null) {
  return prisma.file.findMany({
    where: { organizationId, agencyId, folderId },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listCampaignFiles(campaignId: string) {
  return prisma.file.findMany({
    where: { campaignId },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFolderPath(folderId: string): Promise<{ id: string; name: string }[]> {
  const path: { id: string; name: string }[] = [];
  let current = await prisma.folder.findUnique({ where: { id: folderId }, select: { id: true, name: true, parentFolderId: true } });
  while (current) {
    path.unshift({ id: current.id, name: current.name });
    current = current.parentFolderId
      ? await prisma.folder.findUnique({ where: { id: current.parentFolderId }, select: { id: true, name: true, parentFolderId: true } })
      : null;
  }
  return path;
}
