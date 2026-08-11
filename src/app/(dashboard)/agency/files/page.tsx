import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canManageFiles } from "@/features/agencies/config/agency-permissions";
import { listFolders, listFilesInFolder, getFolderPath } from "@/features/agencies/services/agency-file.service";
import { NewFolderDialog, FolderList, FileList } from "@/features/agencies/components/agency-files-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Files" };

export default async function AgencyFilesPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const { folder } = await searchParams;
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);
  const currentFolderId = folder ?? null;

  const [folders, files, path] = await Promise.all([
    listFolders(actor.organizationId, agencyId, currentFolderId),
    listFilesInFolder(actor.organizationId, agencyId, currentFolderId),
    currentFolderId ? getFolderPath(currentFolderId) : Promise.resolve([]),
  ]);

  const canManage = canManageFiles(actor.agencyRole);

  return (
    <div className="space-y-6">
      {currentFolderId && (
        <Link href={path.length > 1 ? `/agency/files?folder=${path[path.length - 2].id}` : "/agency/files"} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {path.length > 1 ? path[path.length - 2].name : "Files"}
        </Link>
      )}

      <PageHeader
        title={currentFolderId ? (path.at(-1)?.name ?? "Folder") : "Files"}
        description="Shared agency storage — folders, permissions, contracts, deliverables."
        actions={canManage ? <NewFolderDialog parentFolderId={currentFolderId} /> : undefined}
      />

      {path.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/agency/files" className="hover:text-foreground">
            Files
          </Link>
          {path.map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <span>/</span>
              <Link href={`/agency/files?folder=${p.id}`} className="hover:text-foreground">
                {p.name}
              </Link>
            </span>
          ))}
        </div>
      )}

      {folders.length === 0 && files.length === 0 && !canManage ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
          <FolderOpen className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">This folder is empty.</p>
        </div>
      ) : (
        <>
          <FolderList folders={folders} canManage={canManage} />
          <FileList
            files={files.map((f) => ({ id: f.id, name: f.name, url: f.url, uploadedBy: f.uploadedBy }))}
            folderId={currentFolderId}
            canManage={canManage}
          />
        </>
      )}
    </div>
  );
}
